import { contextBridge, ipcRenderer } from 'electron'
// import { electronAPI } from '@electron-toolkit/preload'
// Custom APIs for renderer
const api = {
  checkingOllama:():Promise<boolean>=> ipcRenderer.invoke('checkingOllama'),
  checkingBinaries:():Promise<boolean>=> ipcRenderer.invoke('checkingBinaries'),
  downloadingOllama:():Promise<string>=> ipcRenderer.invoke('downloadingOllama'),
  installingOllama:():Promise<boolean>=> ipcRenderer.invoke('installingOllama'),
  checkVersion:():Promise<string>=> ipcRenderer.invoke('checkVersion'),
}




// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if(!process.contextIsolated){
  throw new Error('contextIsolation must be enabled in the browserwindow')
}
try {
    // this does not work for some reason
    // contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }