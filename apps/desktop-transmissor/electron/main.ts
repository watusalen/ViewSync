import { app, BrowserWindow, desktopCapturer, ipcMain, dialog } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { fork, ChildProcess } from 'node:child_process'

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('enable-features', 'DesktopCaptureExtensions');
app.commandLine.appendSwitch('disable-features', 'WebRtcAllowWgcScreenCapturer,WebRtcAllowWgcWindowCapturer,WebRtcAllowWgcCapturer');
app.commandLine.appendSwitch('log-level', '3');
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

const __dirname = path.dirname(fileURLToPath(import.meta.url))
process.env.APP_ROOT = path.join(__dirname, '..')

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let serverProcess: ChildProcess | null = null

const startInternalServer = () => {
  const serverPath = path.join(MAIN_DIST, 'server.js')
  
  serverProcess = fork(serverPath, [], {
    env: {
      ...process.env,
      RENDERER_DIST,
      APP_ROOT: process.env.APP_ROOT,
      IS_PACKAGED: app.isPackaged.toString(),
      RESOURCES_PATH: process.resourcesPath
    },
    stdio: 'inherit'
  })

  serverProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      if (app.isPackaged) {
        dialog.showErrorBox(
          'Erro Crítico no Servidor', 
          `O motor de vídeo (Mediasoup) falhou ao iniciar (Código: ${code}).\nIsso geralmente ocorre se o executável do worker ficou preso dentro do app.asar.`
        );
      }
    }
  })
}

const setupIPCHandlers = () => {
  ipcMain.handle('get-desktop-sources', async () => {
    try {
      const sources = await desktopCapturer.getSources({ types: ['window', 'screen'], fetchWindowIcons: true })
      return sources.map(source => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL()
      }))
    } catch (error) {
      return [];
    }
  })
}

function createWindow() {
  win = new BrowserWindow({
    title: "ViewSync Studio",
    icon: path.join(process.env.VITE_PUBLIC, process.platform === 'win32' ? 'ico.ico' : 'ico.icns'),
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    },
  })

  win.setMenuBarVisibility(false)

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill()
  if (process.platform !== 'darwin') app.quit()
})

app.whenReady().then(() => {
  setupIPCHandlers();
  startInternalServer();
  createWindow();
})