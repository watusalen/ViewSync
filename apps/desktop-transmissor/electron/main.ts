import { app, BrowserWindow } from 'electron'
import { createMainWindow } from './main/createMainWindow'
import { configureAppFlags, mainProcessEnvironment } from './main/environment'
import { registerIpcHandlers } from './main/ipcHandlers'
import { createServerProcessController } from './main/serverProcess'

configureAppFlags()

let win: BrowserWindow | null = null

const serverProcessController = createServerProcessController({
  mainDist: mainProcessEnvironment.mainDist,
  appRoot: mainProcessEnvironment.appRoot,
  rendererDist: mainProcessEnvironment.rendererDist,
})

const openMainWindow = () => {
  win = createMainWindow({
    currentDir: mainProcessEnvironment.currentDir,
    devServerUrl: mainProcessEnvironment.devServerUrl,
    rendererDist: mainProcessEnvironment.rendererDist,
  })

  win.on('closed', () => {
    win = null
  })
}

app.on('window-all-closed', () => {
  serverProcessController.stop()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  serverProcessController.stop()
})

const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
}

app.on('second-instance', () => {
  if (!win) return
  if (win.isMinimized()) win.restore()
  win.focus()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    openMainWindow()
  }
})

app.whenReady().then(() => {
  registerIpcHandlers()
  serverProcessController.start()
  openMainWindow()
})