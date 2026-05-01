import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

const socket: Socket = io('http://localhost')

export default function App() {
  const [sources, setSources] = useState<any[]>([])
  const [selectedSource, setSelectedSource] = useState<string | null>(null)

  const [fps, setFps] = useState<number>(30)
  const [password, setPassword] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [serverIp, setServerIp] = useState('Carregando...')
  const [networkName, setNetworkName] = useState('Detectando...')
  const [roomState, setRoomState] = useState<any>(null)

  const [isStreaming, setIsStreaming] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamingLoopRef = useRef<number | NodeJS.Timeout | null>(null)

  const loadInitialData = async () => {
    try {
      const desktopSources = await (window as any).mirrorAPI.getDesktopSources()
      setSources(desktopSources)
      if (desktopSources.length > 0) {
        setSelectedSource((prev) => prev || desktopSources[0].id)
      }
    } catch (err) {
      console.error("Erro ao carregar fontes de vídeo:", err)
    }
  }

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))
    socket.on('server:info', (data) => {
      setServerIp(data.ip);
      setNetworkName(data.network);
    });

    socket.on('room:state_update', (state) => setRoomState(state))

    loadInitialData()
    const sourceInterval = setInterval(loadInitialData, 5000)

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('server:info')
      socket.off('room:state_update')
      clearInterval(sourceInterval)
    }
  }, [])

  useEffect(() => {
    if (isStreaming && videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;

      const sendFrame = () => {
        if (!videoRef.current || !canvasRef.current || !isStreaming) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { alpha: false });

        if (ctx && videoRef.current.videoWidth > 0) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

          const frameData = canvas.toDataURL('image/jpeg', 0.85);
          socket.emit('host:frame', frameData);
        }
      };

      setTimeout(() => {
        streamingLoopRef.current = setInterval(sendFrame, 1000 / fps);
      }, 1000);
    }

    return () => {
      if (streamingLoopRef.current) clearInterval(streamingLoopRef.current as number);
    };
  }, [isStreaming, localStream, fps]);

  const startStream = async () => {
    if (!selectedSource) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: selectedSource 
          }
        } as any 
      });

      setLocalStream(stream)
      setIsStreaming(true)
      socket.emit('host:start_stream', { config: { fps, hasPassword: password.length > 0 }, password });
    } catch (error) {
      alert('Erro ao capturar a tela. O aplicativo tem permissão?')
    }
  }

  const stopStream = () => {
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    if (streamingLoopRef.current) clearInterval(streamingLoopRef.current as number);
    setLocalStream(null);
    setIsStreaming(false);
    
    socket.emit('host:stop_stream');
  }

  const switchStream = async (newSourceId: string) => {
    if (newSourceId === selectedSource) return;

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: newSourceId,
            maxWidth: 1920,
            maxHeight: 1080
          }
        } as any
      });

      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }

      setSelectedSource(newSourceId);
      setLocalStream(newStream);

    } catch (error) {
      alert('Erro ao tentar trocar de tela.');
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-200">
      <canvas ref={canvasRef} className="hidden" />

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
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Frames por Segundo</label>
              <select className="p-2.5 bg-gray-900 border border-gray-700 rounded-lg outline-none text-white w-48" value={fps} onChange={(e) => setFps(Number(e.target.value))} disabled={isStreaming}>
                <option value={15}>15 FPS (Econômico)</option>
                <option value={30}>30 FPS (Recomendado)</option>
                <option value={60}>60 FPS (Fluido)</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Senha de Acesso</label>
              <input type="text" placeholder="Vazio = Sem senha" title="Opcional" className="p-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white w-64" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isStreaming} />
            </div>
            {!isStreaming ? (
              <button onClick={startStream} disabled={!selectedSource} className="ml-auto bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-blue-500/20 disabled:opacity-40">Iniciar Transmissão</button>
            ) : (
              <button onClick={stopStream} className="ml-auto bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-rose-500/20">Encerrar Agora</button>
            )}
          </div>

          {isStreaming ? (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 shadow-lg space-y-4">
              <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-5 flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-emerald-400 font-bold text-lg flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span> Transmitindo ao Vivo
                  </h3>
                  <div className="text-sm text-gray-300">Conectado a: <span className="text-white font-bold uppercase">{networkName}</span></div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400 block mb-1">Endereço para os alunos:</span>
                  <div className="text-xl font-mono font-bold text-emerald-400 bg-gray-900 px-4 py-2 rounded-lg border border-emerald-900/50 shadow-inner">
                    http://{serverIp}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 text-center">
                  <div className="text-gray-500 text-[10px] uppercase font-black tracking-widest mb-1">Usuários na Rede</div>
                  <div className="text-3xl font-bold text-blue-400 leading-none">{roomState?.connectedCount || 0}</div>
                </div>
                <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 text-center">
                  <div className="text-gray-500 text-[10px] uppercase font-black tracking-widest mb-1">Visualizando Agora</div>
                  <div className="text-3xl font-bold text-emerald-400 leading-none">{roomState?.activeViewersCount || 0}</div>
                </div>
              </div>
              <div className="bg-black rounded-xl overflow-hidden border border-gray-700 aspect-video flex items-center justify-center shadow-2xl">
                <video ref={videoRef} className="w-full h-full object-contain" muted autoPlay playsInline />
              </div>
              <div className="pt-2">
                <h4 className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest font-black">Trocar de tela:</h4>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                  {sources.map(source => (
                    <div
                      key={source.id}
                      onClick={() => switchStream(source.id)}
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
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-200">Escolha a Tela ou Janela:</h2>
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
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
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
    </div>
  )
}