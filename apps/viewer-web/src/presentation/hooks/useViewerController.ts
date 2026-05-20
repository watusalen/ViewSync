'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createViewerCompositionRoot } from '../../application/compositionRoot'
import type { RoomState } from '../../domain/models/RoomState'

const ENROLLMENT_PATTERN = /^(\d{4})(\d{3})([A-Z]{4})(\d{4})$/
const SUSPICIOUS_NAME_PATTERN = /\b(teste|test|asdf|qwerty|admin|usuario|nome|zoado)\b/i

const validateEnrollment = (input: string): string | null => {
  const value = input.trim().toUpperCase()
  const match = value.match(ENROLLMENT_PATTERN)

  if (!match) {
    return 'Matrícula inválida. Use o padrão AAAA999LLLL9999'
  }

  const enrollmentYear = Number(match[1])
  const currentYear = new Date().getFullYear()

  if (enrollmentYear > currentYear || enrollmentYear < 1900) {
    return `Ano da matrícula inválido.`
  }

  return null
}

const normalizeName = (input: string): string => input.replace(/\s+/g, ' ').trim()

const validateName = (input: string): string | null => {
  const value = normalizeName(input)

  if (value.length < 3) {
    return 'Nome deve ter pelo menos 3 caracteres'
  }

  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(value)) {
    return 'Nome inválido. Use apenas letras e espaços'
  }

  if (!/[AEIOUaeiouÀ-ÖØ-öø-ÿ]/.test(value) || /(.)\1{3,}/.test(value)) {
    return 'Nome inválido. Informe um nome real'
  }

  if (SUSPICIOUS_NAME_PATTERN.test(value)) {
    return 'Nome inválido. Informe seu nome real'
  }

  return null
}

export const useViewerController = () => {
  const deps = useMemo(() => createViewerCompositionRoot(), [])

  const [isConnected, setIsConnected] = useState(false)
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [hasViewerIdentity, setHasViewerIdentity] = useState(false)
  const [viewerName, setViewerName] = useState('')
  const [viewerEnrollment, setViewerEnrollment] = useState('')
  const [identityError, setIdentityError] = useState('')
  const [networkName, setNetworkName] = useState('')
  const [inputPassword, setInputPassword] = useState('')
  const [error, setError] = useState('')
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [needsForcePlay, setNeedsForcePlay] = useState(false)
  const [activeProducerId, setActiveProducerId] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isConsumingRef = useRef(false)
  const isJoiningRef = useRef(false)

  const syncVisibility = () => {
    deps.signaling.reportVisibility(document.visibilityState === 'visible' && document.hasFocus())
  }

  // Lida com mudanças de visibilidade da aba
  useEffect(() => {
    const handleVisibility = () => syncVisibility()
    const handleFocus = () => syncVisibility()
    const handleBlur = () => syncVisibility()
    const handlePageShow = () => syncVisibility()
    const handlePageHide = () => deps.signaling.reportVisibility(false)

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('pageshow', handlePageShow)
    window.addEventListener('pagehide', handlePageHide)

    const unsubConnect = deps.signaling.onConnect(() => {
      setIsConnected(true)
      syncVisibility()
    })
    const unsubDisconnect = deps.signaling.onDisconnect(() => setIsConnected(false))
    const unsubServerInfo = deps.signaling.onServerInfo((info) => {
      setNetworkName(info.network || '')
    })

    const unsubRoomState = deps.signaling.onRoomState((state) => {
      setRoomState(state)

      if (state.isStreaming) {
        if (state.config?.producerId) setActiveProducerId(state.config.producerId)
      } else {
        // Stream encerrado — limpa tudo
        setIsAuthenticated(false)
        isJoiningRef.current = false
        setActiveProducerId(null)
        setInputPassword('')
        setError('')
        isConsumingRef.current = false
        deps.consumer.dispose()
        if (videoRef.current) videoRef.current.srcObject = null
      }
    })

    const unsubAuthorized = deps.signaling.onAuthorized(() => {
      isJoiningRef.current = false
      setIsAuthenticated(true)
      setError('')
      syncVisibility()
    })

    const unsubNewProducer = deps.signaling.onNewProducer(setActiveProducerId)
    const unsubError = deps.signaling.onError(setError)

    // Fullscreen
    const onFsChange = () => {
      setIsFullScreen(
        !!(document.fullscreenElement || (document as any).webkitFullscreenElement)
      )
    }
    document.addEventListener('fullscreenchange', onFsChange)
    document.addEventListener('webkitfullscreenchange', onFsChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('pageshow', handlePageShow)
      window.removeEventListener('pagehide', handlePageHide)
      document.removeEventListener('fullscreenchange', onFsChange)
      document.removeEventListener('webkitfullscreenchange', onFsChange)
      unsubConnect()
      unsubDisconnect()
      unsubServerInfo()
      unsubRoomState()
      unsubAuthorized()
      unsubNewProducer()
      unsubError()
      deps.signaling.dispose()
      deps.consumer.dispose()
    }
  }, [deps])

  useEffect(() => {
    if (!hasViewerIdentity) return
    if (!roomState?.isStreaming) return
    if (roomState.config?.hasPassword) return
    if (isAuthenticated || isJoiningRef.current) return

    isJoiningRef.current = true
    deps.signaling.joinRoom('', {
      enrollment: viewerEnrollment.trim(),
      name: viewerName.trim(),
    })
  }, [
    deps,
    hasViewerIdentity,
    isAuthenticated,
    roomState?.isStreaming,
    roomState?.config?.hasPassword,
    viewerEnrollment,
    viewerName,
  ])

  // Dispara o consumo quando o viewer é autenticado e há um producer ativo
  useEffect(() => {
    if (!isAuthenticated || !activeProducerId || isConsumingRef.current) return
    isConsumingRef.current = true

    deps.consumer.consumeStream(activeProducerId)
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
            .then(() => setNeedsForcePlay(false))
            .catch(() => setNeedsForcePlay(true))
        }
      })
      .catch(() => {
        isConsumingRef.current = false
      })
  }, [isAuthenticated, activeProducerId, deps])

  const joinRoom = () => {
    if (roomState?.config?.hasPassword && !inputPassword.trim()) {
      setError('Digite a senha da sala')
      return
    }

    isJoiningRef.current = true
    deps.signaling.joinRoom(inputPassword, {
      enrollment: viewerEnrollment.trim(),
      name: viewerName.trim(),
    })
  }

  const submitViewerIdentity = () => {
    const normalizedEnrollment = viewerEnrollment.trim().toUpperCase()
    const normalizedName = normalizeName(viewerName)

    if (!normalizedEnrollment || !normalizedName) {
      setIdentityError('Preencha matrícula e nome para continuar')
      return
    }

    const enrollmentError = validateEnrollment(normalizedEnrollment)
    if (enrollmentError) {
      setIdentityError(enrollmentError)
      return
    }

    const nameError = validateName(normalizedName)
    if (nameError) {
      setIdentityError(nameError)
      return
    }

    setViewerEnrollment(normalizedEnrollment)
    setViewerName(normalizedName)
    setIdentityError('')
    setHasViewerIdentity(true)
  }

  const onViewerEnrollmentChange = (value: string) => {
    setViewerEnrollment(value.toUpperCase().replace(/\s+/g, ''))
    setIdentityError('')
  }

  const onViewerNameChange = (value: string) => {
    setViewerName(value)
    setIdentityError('')
  }

  const forcePlay = () => {
    videoRef.current?.play()
      .then(() => setNeedsForcePlay(false))
      .catch(() => {})
  }

  const toggleFullScreen = () => {
    const el = containerRef.current
    const video = videoRef.current
    if (!el || !video) return

    const isIphone = /iPhone/i.test(navigator.userAgent)
    if (isIphone) {
      if ((video as any).webkitEnterFullscreen) (video as any).webkitEnterFullscreen()
      else video.requestFullscreen?.()
      return
    }

    const doc = document as any
    if (!document.fullscreenElement && !doc.webkitFullscreenElement) {
      (el.requestFullscreen?.() ?? (el as any).webkitRequestFullscreen?.())
    } else {
      (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.())
    }
  }

  return {
    isConnected,
    networkName,
    roomState,
    isAuthenticated,
    hasViewerIdentity,
    viewerName,
    setViewerName: onViewerNameChange,
    viewerEnrollment,
    setViewerEnrollment: onViewerEnrollmentChange,
    identityError,
    inputPassword,
    setInputPassword,
    error,
    isFullScreen,
    needsForcePlay,
    videoRef,
    containerRef,
    submitViewerIdentity,
    joinRoom,
    forcePlay,
    toggleFullScreen,
  }
}
