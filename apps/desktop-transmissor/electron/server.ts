import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import path from 'node:path'
import {
  APP_ROOT,
  HTTP_PORT,
  IS_PACKAGED,
  RENDERER_DIST,
  RESOURCES_PATH,
  RTC_MAX_PORT,
  RTC_MIN_PORT,
} from './signaling/config'
import { getNetworkDetails } from './signaling/network'
import { RoomSessionState } from './signaling/RoomSessionState'
import { MediasoupEngine } from './signaling/MediasoupEngine'
import type {
  ConnectWebRtcTransportPayload,
  ConsumePayload,
  HostStartStreamPayload,
  ProducePayload,
  ResumePayload,
  ViewerJoinPayload,
} from './signaling/types'

const ENROLLMENT_PATTERN = /^(\d{4})(\d{3})([A-Z]{4})(\d{4})$/
const SUSPICIOUS_NAME_PATTERN = /\b(teste|test|asdf|qwerty|admin|usuario|nome|zoado)\b/i

const normalizeName = (name: string): string => name.replace(/\s+/g, ' ').trim()

const isValidEnrollment = (input: string): boolean => {
  const match = input.match(ENROLLMENT_PATTERN)
  if (!match) return false

  const enrollmentYear = Number(match[1])
  const currentYear = new Date().getFullYear()
  return enrollmentYear >= 1900 && enrollmentYear <= currentYear
}

const isValidName = (input: string): boolean => {
  if (input.length < 3) return false
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(input)) return false
  if (!/[AEIOUaeiouÀ-ÖØ-öø-ÿ]/.test(input)) return false
  if (/(.)\1{3,}/.test(input)) return false
  if (SUSPICIOUS_NAME_PATTERN.test(input)) return false
  return true
}

const startServer = async () => {
  const mediasoupEngine = new MediasoupEngine()
  const roomSessionState = new RoomSessionState()

  await mediasoupEngine.initialize(RTC_MIN_PORT, RTC_MAX_PORT)
  void getNetworkDetails().catch(() => undefined)

  const expressApp = express()
  const httpServer = createServer(expressApp)

  const io = new Server(httpServer, {
    cors: { origin: '*' },
    perMessageDeflate: false,
    maxHttpBufferSize: 1e7
  })

  const viewerPath = IS_PACKAGED
    ? path.join(RESOURCES_PATH, 'viewer')
    : path.join(APP_ROOT, '../viewer-web/out')

  expressApp.use(express.static(viewerPath))
  expressApp.use('/studio', express.static(RENDERER_DIST))

  const broadcastState = () => {
    const state = roomSessionState.buildPublicState()
    io.emit('room:state_update', state)
  }

  io.on('connection', async (socket) => {
    roomSessionState.onSocketConnected(socket.id)

    const net = await getNetworkDetails()
    socket.emit('server:info', { ip: net.ip, network: net.network, port: HTTP_PORT })
    broadcastState()

    socket.on('disconnect', () => {
      const identity = roomSessionState.getViewerIdentity(socket.id)
      if (identity) {
        console.info(
          `[Viewer saiu] matrícula=${identity.enrollment} nome="${identity.name}" socket=${socket.id}`
        )
      }

      roomSessionState.onSocketDisconnect(socket.id)
      broadcastState()
    })

    socket.on('host:start_stream', (payload: HostStartStreamPayload) => {
      roomSessionState.onHostStartStream(socket.id, payload)
      broadcastState()
    })

    socket.on('host:stop_stream', () => {
      if (roomSessionState.onHostStopStream(socket.id)) {
        broadcastState()
      }
    })

    socket.on('viewer:join', (payload: ViewerJoinPayload) => {
      const enrollment = payload.viewerEnrollment?.trim().toUpperCase() || ''
      const name = normalizeName(payload.viewerName || '')

      if (!isValidEnrollment(enrollment)) {
        socket.emit('error', 'Matrícula inválida. Use o padrão AAAA999LLLL9999.')
        return
      }

      if (!isValidName(name)) {
        socket.emit('error', 'Nome inválido. Informe seu nome real para continuar.')
        return
      }

      if (!roomSessionState.isViewerAuthorized(payload)) {
        socket.emit('error', 'Senha incorreta.')
        return
      }

      roomSessionState.registerViewerIdentity(socket.id, enrollment, name)

      console.info(
        `[Viewer entrou] matrícula=${enrollment} nome="${name}" socket=${socket.id}`
      )

      socket.emit('viewer:authorized')
      broadcastState()
    })

    socket.on('viewer:visibility_change', async (isVisible) => {
      if (roomSessionState.isHostSocket(socket.id)) return

      try {
        roomSessionState.setViewerVisibility(socket.id, Boolean(isVisible))
        await mediasoupEngine.syncViewerVisibility(socket.id, Boolean(isVisible))
        broadcastState()
      } catch {}
    })

    socket.on('mediasoup:getRouterRtpCapabilities', (callback) =>
      callback(mediasoupEngine.getRouterRtpCapabilities())
    )

    socket.on('mediasoup:createWebRtcTransport', async (_: { direction?: string }, callback) => {
      const transport = await mediasoupEngine.createWebRtcTransport()
      callback({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      })
    })

    socket.on('mediasoup:connectWebRtcTransport', async (
      payload: ConnectWebRtcTransportPayload,
      callback: () => void
    ) => {
      await mediasoupEngine.connectWebRtcTransport(payload)
      callback()
    })

    socket.on('mediasoup:produce', async (
      payload: ProducePayload,
      callback: (p: { id: string }) => void
    ) => {
      const producerId = await mediasoupEngine.produce(payload)
      if (!producerId) return

      callback({ id: producerId })
      socket.broadcast.emit('mediasoup:newProducer', { producerId })
    })

    socket.on('mediasoup:consume', async (
      payload: ConsumePayload,
      callback: (p: object) => void
    ) => {
      const consumer = await mediasoupEngine.consume(socket.id, payload)
      if (!consumer) return
      callback(consumer)
    })

    socket.on('mediasoup:resume', async (
      payload: ResumePayload,
      callback: () => void
    ) => {
      await mediasoupEngine.resume(payload)
      callback()
    })
  })

  httpServer.listen(HTTP_PORT, '0.0.0.0')
}

startServer()