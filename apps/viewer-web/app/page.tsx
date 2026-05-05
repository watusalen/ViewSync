'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Device } from 'mediasoup-client';
import { Monitor, Shield, Play, Maximize, Wifi, Lock, AlertCircle, Users, Minimize } from 'lucide-react';

export default function ViewerPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [roomState, setRoomState] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeProducerId, setActiveProducerId] = useState<string | null>(null);
  const [inputPassword, setInputPassword] = useState('');
  const [error, setError] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [needsForcePlay, setNeedsForcePlay] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const consumerTransportRef = useRef<any>(null);

  useEffect(() => {
    const socket = io(`http://${window.location.hostname}:3000`);
    socketRef.current = socket;

    const handleVisibility = () => {
      socket.emit('viewer:visibility_change', document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibility);

    socket.on('connect', () => {
      setIsConnected(true);
      handleVisibility();
    });
    
    socket.on('room:state_update', (state: any) => {
      setRoomState(state);
      
      if (state.isStreaming) {
        if (state.config?.producerId) setActiveProducerId(state.config.producerId);
        if (!state.config?.hasPassword) setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setActiveProducerId(null);
        setInputPassword('');
        setError('');
        if (videoRef.current) videoRef.current.srcObject = null;
        if (consumerTransportRef.current) {
          consumerTransportRef.current.close();
          consumerTransportRef.current = null;
        }
      }
    });

    socket.on('viewer:authorized', () => {
      setIsAuthenticated(true);
      setError('');
    });

    socket.on('mediasoup:newProducer', ({ producerId }) => {
      setActiveProducerId(producerId);
    });

    socket.on('error', (msg: string) => setError(msg));

    const onFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement || !!(document as any).webkitFullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullScreenChange);
    document.addEventListener('webkitfullscreenchange', onFullScreenChange);

    return () => { 
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('fullscreenchange', onFullScreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullScreenChange);
      socket.disconnect(); 
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && activeProducerId && !consumerTransportRef.current) {
      consume(activeProducerId);
    }
  }, [isAuthenticated, activeProducerId]);

  const consume = async (producerId: string) => {
    try {
      const socket = socketRef.current;
      if (!socket) return;

      const rtpCapabilities = await new Promise(resolve => {
        socket.emit('mediasoup:getRouterRtpCapabilities', resolve)
      })

      let device = deviceRef.current;
      if (!device) {
        device = new Device();
        await device.load({ routerRtpCapabilities: rtpCapabilities as any });
        deviceRef.current = device;
      }

      const transportParams: any = await new Promise(resolve => {
        socket.emit('mediasoup:createWebRtcTransport', { direction: 'recv' }, resolve)
      })

      const transport = device.createRecvTransport(transportParams);
      consumerTransportRef.current = transport;
      
      transport.on('connect', ({ dtlsParameters }, callback, _errback) => {
        socket.emit('mediasoup:connectWebRtcTransport', { transportId: transport.id, dtlsParameters }, callback)
      })

      const consumerParams: any = await new Promise(resolve => {
        socket.emit('mediasoup:consume', {
          transportId: transport.id,
          producerId,
          rtpCapabilities: device!.rtpCapabilities
        }, resolve)
      })

      const consumer = await transport.consume(consumerParams);
      
      socket.emit('mediasoup:resume', { transportId: transport.id, consumerId: consumer.id }, () => {
        const { track } = consumer;
        if (videoRef.current) {
          videoRef.current.srcObject = new MediaStream([track]);
          videoRef.current.play().then(() => {
            setNeedsForcePlay(false);
          }).catch((err) => {
            console.warn("Autoplay bloqueado pelo Safari, aguardando clique:", err);
            setNeedsForcePlay(true);
          });
        }
      })
    } catch (err) {
      console.error('Erro ao consumir stream:', err);
      consumerTransportRef.current = null;
    }
  };

  const forcePlay = () => {
    if (videoRef.current) {
      videoRef.current.play()
        .then(() => setNeedsForcePlay(false))
        .catch(console.error);
    }
  }

  const joinRoom = () => {
    if (!inputPassword.trim()) {
      setError('Digite a senha da sala');
      return;
    }
    socketRef.current?.emit('viewer:join', { password: inputPassword });
  };

  const toggleFullScreen = () => {
    const el = containerRef.current;
    const video = videoRef.current;
    if (!el || !video) return;

    const isiPhone = /iPhone/i.test(navigator.userAgent);

    if (isiPhone) {
      if ((video as any).webkitEnterFullscreen) {
        (video as any).webkitEnterFullscreen();
      } else if (video.requestFullscreen) {
        video.requestFullscreen();
      }
      return;
    }

    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if ((el as any).webkitRequestFullscreen) {
        (el as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-[#050506] flex flex-col items-center justify-center overflow-hidden text-gray-200 font-sans select-none touch-none">
      
      {/* Header Estilo Vidro */}
      {!isFullScreen && (
        <header className="absolute top-0 left-0 right-0 h-14 border-b border-white/5 bg-white/[0.03] backdrop-blur-2xl flex items-center justify-between px-4 z-50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600/20 border border-blue-500/30 rounded-lg flex items-center justify-center text-blue-400 font-black text-[10px]">Vs</div>
            <h1 className="text-sm font-bold tracking-tight text-white/90">ViewSync <span className="text-blue-400 font-light hidden xs:inline">Viewer</span></h1>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.05] rounded-full border border-white/10 backdrop-blur-md">
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400">{isConnected ? 'On' : 'Off'}</span>
            </div>
            {roomState?.isStreaming && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 rounded-full border border-rose-500/20 backdrop-blur-md">
                <span className="text-[8px] font-bold uppercase tracking-widest text-rose-500">LIVE</span>
              </div>
            )}
          </div>
        </header>
      )}

      {!roomState?.isStreaming ? (
        <div className="text-center space-y-6 px-6 animate-in fade-in zoom-in duration-700">
          <div className="w-20 h-20 bg-white/[0.02] rounded-full flex items-center justify-center mx-auto border border-white/5 shadow-2xl relative">
             <div className="absolute inset-0 bg-blue-500/[0.05] blur-3xl rounded-full" />
             <Monitor className="w-8 h-8 text-white/20 relative z-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white/80 tracking-tight">Sala de Aula Digital</h2>
            <p className="text-sm text-white/30 max-w-[250px] mx-auto font-medium">Aguardando o professor iniciar a transmissão...</p>
          </div>
        </div>
      ) : !isAuthenticated ? (
        <div className="w-full max-w-sm mx-auto px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white/[0.03] backdrop-blur-3xl p-7 rounded-[2rem] border border-white/10 shadow-2xl space-y-8">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 bg-white/[0.05] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/10">
                <Lock className="w-6 h-6 text-white/40" />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">Sala Protegida</h2>
              <p className="text-white/40 text-xs font-medium">Insira a senha de acesso para entrar.</p>
            </div>
            
            <div className="space-y-5">
              <div className="relative group">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="password" 
                  placeholder="••••••••"
                  className="w-full bg-white/[0.02] border border-white/10 p-4 pl-12 rounded-2xl outline-none focus:border-blue-500/50 text-center text-lg tracking-[0.4em] transition-all placeholder:tracking-normal placeholder:text-white/10"
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
                />
              </div>
              
              {error && (
                <div className="flex items-center gap-2 justify-center text-rose-400 text-[10px] font-bold bg-rose-500/5 py-3 rounded-xl border border-rose-500/10 px-2 text-center animate-shake">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {error}
                </div>
              )}
              
              <button onClick={joinRoom} className="w-full bg-blue-600/80 hover:bg-blue-600 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-600/10 active:scale-[0.98]">
                ENTRAR AGORA
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div 
          ref={containerRef} 
          className="relative w-full h-full group flex items-center justify-center bg-black overflow-hidden"
          onClick={() => {
            const controls = document.getElementById('floating-controls');
            const status = document.getElementById('status-overlay');
            controls?.classList.toggle('opacity-100');
            status?.classList.toggle('opacity-100');
          }}
        >
          {/* Overlay de Status Vidro: ESQUERDA EM CIMA */}
          <div id="status-overlay" className={`absolute top-6 left-6 z-40 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex flex-col gap-2 ${isFullScreen ? 'top-6' : 'top-20'}`}>
             <div className="flex items-center gap-3 px-3 py-2 bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl">
                <Users className="w-3.5 h-3.5 text-blue-400/80" />
                <span className="text-[10px] font-bold tracking-tight text-white/60">{roomState?.connectedCount || 0} na sala</span>
             </div>
          </div>

          <video 
            ref={videoRef} 
            autoPlay 
            playsInline
            muted
            className="w-full h-full object-contain pointer-events-none" 
          />

          {/* Botão de Emergência Estilo Vidro */}
          {needsForcePlay && (
             <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                <button onClick={(e) => { e.stopPropagation(); forcePlay(); }} className="bg-white/[0.05] p-6 rounded-full shadow-2xl border border-white/20 backdrop-blur-xl group active:scale-95 transition-all">
                   <Play className="w-10 h-10 text-white fill-white transition-transform group-hover:scale-110" />
                </button>
             </div>
          )}
          
          {/* Botão Expandir Vidro: DIREITA EM BAIXO (Menor e mais elegante) */}
          <div id="floating-controls" className="absolute bottom-6 right-6 z-50 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-300">
            <button 
              onClick={(e) => { e.stopPropagation(); toggleFullScreen(); }} 
              className="bg-white/[0.05] p-3.5 rounded-2xl backdrop-blur-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/[0.1] active:scale-90 transition-all shadow-2xl flex items-center gap-2"
            >
              {isFullScreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              <span className="text-[10px] font-black pr-1 hidden sm:block uppercase tracking-wider">{isFullScreen ? "Sair" : "Expandir"}</span>
            </button>
          </div>
          
          {/* Moldura sutil (apenas desktop) */}
          {!isFullScreen && (
            <div className="absolute inset-0 border-[10px] border-[#050506] pointer-events-none hidden md:block rounded-[2.5rem]" />
          )}
        </div>
      )}
      
      {/* Footer minimalista em vidro */}
      {!isFullScreen && (
        <footer className="absolute bottom-4 text-[7px] font-bold text-white/10 uppercase tracking-[0.4em] pointer-events-none text-center px-4">
          Powered by ViewSync SFU &bull; Desenvolvido por Kellviny &bull; 2026
        </footer>
      )}
    </div>
  );
}
