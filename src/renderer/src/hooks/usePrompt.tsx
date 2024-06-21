import {
  chatAtom,
  experimentalSearchAtom,
  imageAttatchmentAtom,
  prefModelAtom,
  stopGeneratingAtom,
  streamingAtom
} from '@renderer/store/mocks'
import { ollama } from '@renderer/utils/ollama'
// import axios from 'axios'
import { useAtom, useSetAtom } from 'jotai'
import { useEffect, useRef, useState } from 'react'
import { useDb } from './useDb'
import { toast } from 'sonner'

// interface experimentalSearchType {
//   output: string,
//   sources: string[]
// }

interface userContentType {
  role: string
  content: string
  images?: string[]
}

export function usePrompt(): [boolean, (prompt: string) => Promise<void>] {
  // Defining states
  const [isLoading, setLoading] = useState(false)
  const [chat, setChat] = useAtom(chatAtom)
  const [modelName] = useAtom(prefModelAtom)
  const setStream = useSetAtom(streamingAtom) // to handle streaming
  const [stopGenerating, setStopGenerating] = useAtom(stopGeneratingAtom) // to manage the stop generating button
  const { addChat } = useDb() // this is to add to the db
  const stopGeneratingRef = useRef(stopGenerating) // ref to handle the states correctly here, make sure the stop generating works
  const [imageAttatchment, setImageAttachment] = useAtom(imageAttatchmentAtom) // for images
  const [experimentalSearch, setExperimentalSearch] = useAtom(experimentalSearchAtom)

  // To Debug
  // useEffect(()=>{console.log(stream);
  // },[stream])

  // To ensure, the state update works just right
  useEffect(() => {
    stopGeneratingRef.current = stopGenerating
  }, [stopGenerating])

  const promptReq = async (prompt: string): Promise<void> => {
    setLoading(true)
    try {
      let user: userContentType = { role: 'user', content: prompt }
      const initialUser = user

      let sources = ''

      if (imageAttatchment) {
        user = { images: [imageAttatchment], ...user }
      }

      setChat((preValue) => [...preValue, user])

      // if the experimental search exists it will perform IPC invoke to the main functino and return the new prompt based on the search
      if (experimentalSearch) {
        try {
          const searchResponse = await window.api.experimentalSearch(prompt)
          user = { ...user, content: searchResponse.prompt }
          sources = searchResponse.sources
        } catch (error) {
          toast(`${error}`)
          setExperimentalSearch(false)
          return
        }
      }

      // this allows to have image attachments

      // Other way is to use axios, but could not figure out native streaming handling.
      // From what I could gather, axios does not use fetch in the background to make calls

      // const req = { model: modelName, messages: [...chat, user], stream: true }
      // const response = await axios.post('http://localhost:11434/api/chat', JSON.stringify(req), {
      //   responseType: 'stream'
      // })

      const response = await ollama.chat({
        model: modelName,
        messages: [...chat, user],
        stream: true
      })

      let chunk = ''

      for await (const part of response) {
        chunk += part.message.content
        // incase stop generating is invoked as true, then we abort the process
        if (part.done == true || stopGeneratingRef.current) {
          // break;
          // defining the ai assistant object which contains the response
          let ai = { role: 'assistant', content: chunk }
          // incase, sources exist we show the relevant citations aswell
          if (sources) {
            ai = { role: 'assistant', content: chunk + '\n' + sources }
          }
          addChat([...chat, initialUser, ai])
          setChat((preValue) => [...preValue, ai])
          setStream('')
          setStopGenerating(false)
          ollama.abort()
          break
        }
        setStream(chunk)
      }
      setExperimentalSearch(false)
      setLoading(false)
      setImageAttachment('')
    } catch (error) {
      console.error(error)
      setLoading(false)
      setImageAttachment('')
      // handling the error with toasts
      toast(`${error}`)
    }
  }
  return [isLoading, promptReq]
}
