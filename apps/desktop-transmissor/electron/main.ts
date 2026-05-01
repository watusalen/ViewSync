import { app, BrowserWindow, desktopCapturer, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import os from 'node:os'

app.commandLine.appendSwitch('log-level', '3');
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

const __dirname = path.dirname(fileURLToPath(import.meta.url))
process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function getNetworkDetails() {
  const interfaces = os.networkInterfaces()
  for (const name in interfaces) {
    for (const iface of interfaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return { ip: iface.address, network: name }
      }
    }
  }
  return { ip: 'localhost', network: 'Desconhecida' }
}

ipcMain.handle('get-desktop-sources', async () => {
  const sources = await desktopCapturer.getSources({ types: ['window', 'screen'], fetchWindowIcons: true })
  return sources.map(source => ({
    id: source.id,
    name: source.name,
    thumbnail: source.thumbnail.toDataURL()
  }))
})

const setupInternalServer = () => {
  const expressApp = express()
  const httpServer = createServer(expressApp)
  const io = new Server(httpServer, {
    cors: { origin: '*' },
    perMessageDeflate: false,
    maxHttpBufferSize: 1e7
  })
  const viewerPath = app.isPackaged
    ? path.join(process.env.APP_ROOT, 'out')
    : path.join(process.env.APP_ROOT, '../viewer-web/out');

  expressApp.use(express.static(viewerPath));

  const roomState = { isStreaming: false, connectedCount: 0, activeViewersCount: 0, config: null as any }
  let currentHostId: string | null = null
  let roomPassword = ''

  const broadcastState = () => io.emit('room:state_update', { ...roomState, hostId: currentHostId })

  io.on('connection', (socket) => {
    const net = getNetworkDetails()
    socket.emit('server:info', { ip: net.ip, network: net.network })

    roomState.connectedCount++
    broadcastState()

    socket.on('disconnect', () => {
      roomState.connectedCount--
      if (socket.id === currentHostId) {
        currentHostId = null; roomState.isStreaming = false; roomState.config = null; roomState.activeViewersCount = 0
      }
      broadcastState()
    })

    socket.on('host:start_stream', (payload) => {
      currentHostId = socket.id; roomPassword = payload.password || ''; roomState.isStreaming = true; roomState.config = payload.config
      broadcastState()
    })

    socket.on('host:stop_stream', () => {
      if (socket.id === currentHostId) {
        currentHostId = null; roomState.isStreaming = false; roomState.config = null; roomState.activeViewersCount = 0
        broadcastState()
      }
    })

    socket.on('host:frame', (frameData) => {
      if (socket.id === currentHostId) {
        socket.broadcast.volatile.emit('room:frame', frameData)
      }
    })

    socket.on('viewer:join', (payload) => {
      if (roomState.config?.hasPassword && payload.password !== roomPassword) {
        socket.emit('error', 'Senha incorreta.'); return
      }
      socket.emit('viewer:authorized')
    })

    socket.on('viewer:visibility_change', (isVisible) => {
      if (isVisible) roomState.activeViewersCount++; else if (roomState.activeViewersCount > 0) roomState.activeViewersCount--
      broadcastState()
    })
  })

  httpServer.listen(80, '0.0.0.0').on('error', (err: any) => {
    console.error('Erro ao iniciar o servidor na porta 80:', err);
  });
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

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.whenReady().then(() => { setupInternalServer(); createWindow() })