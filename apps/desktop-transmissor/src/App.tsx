import { useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'
import { Device } from 'mediasoup-client'
import { Monitor, Play, Square, Shield, Wifi, Users, Copy, Check } from 'lucide-react'

// Conecta ao servidor interno de mídia
const socket = io('http://localhost:3000')

export default function App() {
  const [sources, setSources] = useState<any[]>([])
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [password, setPassword] = useState('')
  const [fps, setFps] = useState(30)
  const [serverIp, setServerIp] = useState('Carregando...')
  const [serverPort, setServerPort] = useState(3000)
  const [networkName, setNetworkName] = useState('Detectando...')
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [roomState, setRoomState] = useState({ connectedCount: 0, activeViewersCount: 0 })
  const [isConnected, setIsConnected] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const deviceRef = useRef<Device | null>(null)
  const producerTransportRef = useRef<any>(null)
  const producerRef = useRef<any>(null)
  const isStartingRef = useRef(false)

  // Efeito para garantir que o preview do vídeo funcione e não fique preto
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream
      videoRef.current.play().catch(err => console.error("Erro ao dar play no preview:", err))
    }
  }, [localStream, isStreaming])

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))
    
    refreshSources()
    socket.on('server:info', (info) => {
      setServerIp(info.ip)
      setServerPort(info.port)
      setNetworkName(info.network || 'Rede Local')
    })
    socket.on('room:state_update', (state) => {
      setRoomState(state)
    })

    // Atualiza a lista de janelas, mas não altera a seleção se já estivermos transmitindo
    const sourceInterval = setInterval(() => {
      if (!isStreaming && !isStartingRef.current) {
        refreshSources()
      }
    }, 5000)

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('server:info')
      socket.off('room:state_update')
      clearInterval(sourceInterval)
    }
  }, [isStreaming])

  // Troca de tela em tempo real se o usuário mudar a seleção durante o streaming
  useEffect(() => {
    if (isStreaming && selectedSource && !isStartingRef.current) {
      switchStream(selectedSource)
    }
  }, [selectedSource])

  const refreshSources = async () => {
    try {
      const s = await (window as any).ipcRenderer.invoke('get-desktop-sources')
      setSources(s)
      // Auto-seleciona a primeira fonte apenas na primeira carga
      if (s.length > 0 && selectedSource === null) {
        setSelectedSource(s[0].id)
      }
    } catch (err) {
      console.error("Erro ao carregar fontes:", err)
    }
  }

  const switchStream = async (newSourceId: string) => {
    if (!isStreaming || !producerRef.current) return

    try {
      const constraints = {
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: newSourceId,
            minFrameRate: 10,
            maxFrameRate: fps
          }
        }
      }
      //@ts-ignore
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      const track = stream.getVideoTracks()[0]

      if (localStream) {
        localStream.getTracks().forEach(t => t.stop())
      }

      await producerRef.current.replaceTrack({ track })
      setLocalStream(stream)
      
      // O useEffect acima já vai tratar o play no videoRef.current
    } catch (error) {
      console.error('Erro ao trocar de tela:', error)
    }
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(`http://${serverIp}:${serverPort}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const startStream = async () => {
    if (!selectedSource || isStartingRef.current) return
    
    isStartingRef.current = true
    const currentId = selectedSource

    try {
      const constraints = {
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: currentId,
            minFrameRate: 10,
            maxFrameRate: fps
          }
        }
      }
      
      //@ts-ignore
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setLocalStream(stream)

      const rtpCapabilities = await new Promise(resolve => {
        socket.emit('mediasoup:getRouterRtpCapabilities', resolve)
      })

      const device = new Device()
      await device.load({ routerRtpCapabilities: rtpCapabilities as any })
      deviceRef.current = device

      const transportParams: any = await new Promise(resolve => {
        socket.emit('mediasoup:createWebRtcTransport', { direction: 'send' }, resolve)
      })

      const transport = device.createSendTransport(transportParams)
      producerTransportRef.current = transport

      transport.on('connect', ({ dtlsParameters }, callback, _errback) => {
        socket.emit('mediasoup:connectWebRtcTransport', { transportId: transport.id, dtlsParameters }, callback)
      })

      transport.on('produce', ({ kind, rtpParameters }, callback, _errback) => {
        socket.emit('mediasoup:produce', { transportId: transport.id, kind, rtpParameters }, callback)
      })

      const track = stream.getVideoTracks()[0]
      const producer = await transport.produce({ track })
      producerRef.current = producer

      setIsStreaming(true)
      socket.emit('host:start_stream', { 
        config: { 
          fps, 
          hasPassword: password.length > 0,
          producerId: producer.id
        }, 
        password 
      })
    } catch (error) {
      console.error('Erro ao iniciar stream:', error)
      alert('Erro ao iniciar captura. Verifique as permissões.')
    } finally {
      isStartingRef.current = false
    }
  }

  const stopStream = () => {
    if (localStream) localStream.getTracks().forEach(t => t.stop())
    setLocalStream(null)
    setIsStreaming(false)
    socket.emit('host:stop_stream')
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-200 font-sans selection:bg-blue-500/30">
      <header className="bg-gray-800 border-b border-gray-700 p-4 shadow-md flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg text-sm">Vs</div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide leading-none">ViewSync <span className="text-blue-400 font-light">Studio</span></h1>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full bg-gray-900 border border-gray-700">
          <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500'}`}></span>  
          {isConnected ? 'Servidor On' : 'Conectando...'}
        </div>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 flex flex-wrap gap-6 items-end">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Taxa de Quadros (FPS)</label>
              <select 
                className="p-2.5 bg-gray-900 border border-gray-700 rounded-lg outline-none text-white w-48 focus:border-blue-500 transition-colors" 
                value={fps} 
                onChange={(e) => setFps(Number(e.target.value))} 
                disabled={isStreaming}
              >
                <option value={15}>15 FPS (Econômico)</option>
                <option value={30}>30 FPS (Recomendado)</option>
                <option value={60}>60 FPS (Fluido)</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Senha da Sala (Opcional)</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="password" 
                  placeholder="Defina uma senha..." 
                  className="p-2.5 pl-10 bg-gray-900 border border-gray-700 rounded-lg text-white w-64 outline-none focus:border-blue-500 transition-colors" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  disabled={isStreaming} 
                />
              </div>
            </div>
            {!isStreaming ? (
              <button 
                onClick={startStream} 
                disabled={!selectedSource || isStartingRef.current} 
                className="ml-auto bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-blue-500/20 disabled:opacity-40 flex items-center gap-2 active:scale-95"
              >
                <Play className="w-5 h-5 fill-current" />
                Iniciar Transmissão
              </button>
            ) : (
              <button 
                onClick={stopStream} 
                className="ml-auto bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-rose-500/20 flex items-center gap-2 active:scale-95"
              >
                <Square className="w-5 h-5 fill-current" />
                Encerrar Agora
              </button>
            )}
          </div>

          {isStreaming ? (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 shadow-lg space-y-4 animate-in fade-in duration-500">
              <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-5 flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-emerald-400 font-bold text-lg flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span> Transmitindo ao Vivo
                  </h3>
                  <div className="text-sm text-gray-300 flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-emerald-500" />
                    Conectado a: <span className="text-white font-bold uppercase">{networkName}</span>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <span className="text-xs text-gray-400 block mb-1">Endereço para os alunos:</span>
                    <div className="flex items-center gap-2">
                      <div className="text-xl font-mono font-bold text-emerald-400 bg-gray-900 px-4 py-2 rounded-lg border border-emerald-900/50 shadow-inner">
                        http://{serverIp}:{serverPort}
                      </div>
                      <button onClick={copyUrl} title="Copiar Link" className="p-2.5 bg-gray-900 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors">
                        {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-700 text-center flex flex-col items-center justify-center gap-1">
                  <div className="flex items-center gap-2 text-gray-500 text-[10px] uppercase font-black tracking-widest">
                    <Users className="w-3 h-3" />
                    Usuários na Rede
                  </div>
                  <div className="text-3xl font-bold text-blue-400 leading-none">{roomState.connectedCount}</div>
                </div>
                <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-700 text-center flex flex-col items-center justify-center gap-1">
                  <div className="flex items-center gap-2 text-gray-500 text-[10px] uppercase font-black tracking-widest">
                    <Monitor className="w-3 h-3" />
                    Visualizando Agora
                  </div>
                  <div className="text-3xl font-bold text-emerald-400 leading-none">{roomState.activeViewersCount}</div>
                </div>
              </div>

              <div className="bg-black rounded-xl overflow-hidden border border-gray-700 aspect-video flex items-center justify-center shadow-2xl group relative">
                <video ref={videoRef} className="w-full h-full object-contain" muted autoPlay playsInline />
                <div className="absolute inset-0 border-4 border-emerald-500/20 pointer-events-none rounded-xl"></div>
              </div>

              <div className="pt-2">
                <h4 className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest font-black flex items-center gap-2">
                  <Monitor className="w-3 h-3 text-blue-500" />
                  Trocar de tela:
                </h4>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">      
                  {sources.map(source => (
                    <div
                      key={source.id}
                      onClick={() => setSelectedSource(source.id)}
                      className={`flex-shrink-0 w-32 cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-300 ${selectedSource === source.id
                        ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)] opacity-100'
                        : 'border-gray-700 opacity-40 hover:opacity-100 hover:border-gray-500'
                        }`}
                    >
                      <img src={source.thumbnail} alt={source.name} className="w-full h-16 object-cover bg-black" />
                      <div className="p-1 text-center text-[9px] truncate bg-gray-900 text-gray-300 font-bold">{source.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <h2 className="text-lg font-medium text-gray-200 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-blue-500" />
                Escolha a Tela ou Janela:
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {sources.map(source => (
                  <div
                    key={source.id}
                    onClick={() => setSelectedSource(source.id)}
                    className={`group cursor-pointer rounded-xl bg-gray-800 border-2 overflow-hidden transition-all duration-300 shadow-lg ${selectedSource === source.id ? 'border-blue-500 scale-[1.03] ring-4 ring-blue-500/10' : 'border-gray-700 opacity-60 hover:opacity-100 hover:border-gray-500'}`}
                  >
                    <div className="relative aspect-video bg-black">
                      <img src={source.thumbnail} alt={source.name} className="w-full h-full object-cover" />
                      {selectedSource === source.id && (
                        <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                          <div className="bg-blue-600 p-2 rounded-full shadow-xl">
                            <Check className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-4 text-center text-xs truncate text-gray-300 font-bold bg-gray-800/80 group-hover:bg-gray-800">{source.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      
      <footer className="p-4 text-center text-gray-600 text-[10px] border-t border-gray-800">
        &copy; 2026 ViewSync &bull; developed by Kellviny
      </footer>
    </div>
  )
}
