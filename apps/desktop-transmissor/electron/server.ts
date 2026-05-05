import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import os from 'node:os'
import path from 'node:path'
import * as mediasoup from 'mediasoup'

const port = 3000
const RENDERER_DIST = process.env.RENDERER_DIST || ''
const APP_ROOT = process.env.APP_ROOT || ''
const IS_PACKAGED = process.env.IS_PACKAGED === 'true'
const RESOURCES_PATH = process.env.RESOURCES_PATH || ''

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

const mediaCodecs: mediasoup.types.RtpCodecCapability[] = [
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    preferredPayloadType: 101,
    parameters: { 
      'x-google-start-bitrate': 1000,
      'x-google-max-bitrate': 5000 
    }
  }
]

let worker: mediasoup.types.Worker
let router: mediasoup.types.Router
const transports = new Map<string, mediasoup.types.WebRtcTransport>()
const producers = new Map<string, mediasoup.types.Producer>()
const consumers = new Map<string, mediasoup.types.Consumer>()

const createWorker = async () => {
  worker = await mediasoup.createWorker({
    rtcMinPort: 40000,
    rtcMaxPort: 41000,
    logLevel: 'warn',
  })
  worker.on('died', () => {
    process.exit(1)
  })
  router = await worker.createRouter({ mediaCodecs })
}

const createWebRtcTransport = async () => {
  const ip = getNetworkDetails().ip;
  
  const transport = await router.createWebRtcTransport({
    listenIps: [
      { ip: '0.0.0.0', announcedIp: ip },
      { ip: '0.0.0.0', announcedIp: '127.0.0.1' }
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  })

  transport.on('dtlsstatechange', dtlsState => { 
    if (dtlsState === 'closed') transport.close();
  })

  transports.set(transport.id, transport)
  return transport
}

const startServer = async () => {
  await createWorker()

  const expressApp = express()
  const httpServer = createServer(expressApp)
  const io = new Server(httpServer, {
    cors: { origin: '*' },
    perMessageDeflate: false,
    maxHttpBufferSize: 1e7
  })

  const viewerPath = IS_PACKAGED
    ? path.join(RESOURCES_PATH, 'viewer')
    : path.join(APP_ROOT, '../viewer-web/out');

  expressApp.use(express.static(viewerPath));
  expressApp.use('/studio', express.static(RENDERER_DIST));

  const roomState = { isStreaming: false, connectedCount: 0, activeViewersCount: 0, config: null as any }
  let currentHostId: string | null = null
  let roomPassword = ''
  const activeViewers = new Set<string>()

  const broadcastState = () => {
    const totalSockets = io.engine.clientsCount
    const actualViewersCount = currentHostId ? Math.max(0, totalSockets - 1) : totalSockets
    
    io.emit('room:state_update', { 
      ...roomState, 
      connectedCount: actualViewersCount,
      activeViewersCount: activeViewers.size,
      hostId: currentHostId 
    })
  }

  io.on('connection', (socket) => {
    const net = getNetworkDetails()
    socket.emit('server:info', { ip: net.ip, network: net.network, port })
    broadcastState()

    socket.on('disconnect', () => {
      activeViewers.delete(socket.id)
      if (socket.id === currentHostId) {
        currentHostId = null; 
        roomState.isStreaming = false; 
        roomState.config = null; 
      }
      broadcastState()
    })

    socket.on('host:start_stream', (payload) => {
      currentHostId = socket.id; 
      activeViewers.delete(socket.id);
      roomPassword = payload.password || ''; 
      roomState.isStreaming = true; 
      roomState.config = payload.config
      broadcastState()
    })

    socket.on('host:stop_stream', () => {
      if (socket.id === currentHostId) {
        currentHostId = null; roomState.isStreaming = false; roomState.config = null;
        broadcastState()
      }
    })

    socket.on('viewer:join', (payload) => {
      if (roomState.config?.hasPassword && payload.password !== roomPassword) {
        socket.emit('error', 'Senha incorreta.'); return
      }
      socket.emit('viewer:authorized')
    })

    socket.on('viewer:visibility_change', async (isVisible) => {
      if (socket.id === currentHostId) return;

      try {
        if (isVisible) activeViewers.add(socket.id); 
        else activeViewers.delete(socket.id);
        
        for (const consumer of consumers.values()) {
          if (socket.id === consumer.appData.socketId) {
            if (consumer.closed) continue;
            if (isVisible) await consumer.resume().catch(() => {});
            else await consumer.pause().catch(() => {});
          }
        }
        broadcastState()
      } catch (err) {}
    })

    socket.on('mediasoup:getRouterRtpCapabilities', (callback) => callback(router.rtpCapabilities))

    socket.on('mediasoup:createWebRtcTransport', async ({ direction: _direction }, callback) => {
      const transport = await createWebRtcTransport()
      callback({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      })
    })

    socket.on('mediasoup:connectWebRtcTransport', async ({ transportId, dtlsParameters }, callback) => {
      const transport = transports.get(transportId)
      if (transport) { await transport.connect({ dtlsParameters }); callback() }
    })

    socket.on('mediasoup:produce', async ({ transportId, kind, rtpParameters }, callback) => {
      const transport = transports.get(transportId)
      if (transport) {
        const producer = await transport.produce({ kind: kind as any, rtpParameters: rtpParameters as any })
        producers.set(producer.id, producer)
        producer.on('transportclose', () => { producer.close(); producers.delete(producer.id) })
        callback({ id: producer.id })
        socket.broadcast.emit('mediasoup:newProducer', { producerId: producer.id })
      }
    })

    socket.on('mediasoup:consume', async ({ transportId, producerId, rtpCapabilities }, callback) => {
      if (!router.canConsume({ producerId, rtpCapabilities })) return
      const transport = transports.get(transportId)
      if (transport) {
        const consumer = await transport.consume({ producerId, rtpCapabilities, paused: true, appData: { socketId: socket.id } })
        consumers.set(consumer.id, consumer)
        consumer.on('transportclose', () => { consumer.close(); consumers.delete(consumer.id) })
        callback({ id: consumer.id, producerId: consumer.producerId, kind: consumer.kind, rtpParameters: consumer.rtpParameters })
      }
    })

    socket.on('mediasoup:resume', async ({ transportId: _transportId, consumerId }, callback) => {
      const consumer = consumers.get(consumerId)
      if (consumer) { await consumer.resume(); callback() }
    })
  })

  httpServer.listen(port, '0.0.0.0', () => {});
}

startServer();