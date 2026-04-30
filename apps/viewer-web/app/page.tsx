'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export default function ViewerPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [roomState, setRoomState] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [error, setError] = useState('');

  // NOVA ABORDAGEM: Uma tag de imagem!
  const imgRef = useRef<HTMLImageElement>(null);
  const socketRef = useRef<Socket | null>(null);

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
        if (!state.config?.hasPassword) setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setInputPassword('');
        setError('');
        if (imgRef.current) imgRef.current.src = '';
      }
    });

    socket.on('viewer:authorized', () => {
      setIsAuthenticated(true);
      setError('');
    });

    socket.on('error', (msg: string) => setError(msg));

    // A MÁGICA OFFLINE: Recebe o Frame JPEG e joga direto na tela
    socket.on('room:frame', (frameData: string) => {
      // Usamos ref direto para máxima performance sem travar o React
      if (imgRef.current) {
        imgRef.current.src = frameData;
      }
    });

    return () => { 
      document.removeEventListener('visibilitychange', handleVisibility);
      socket.disconnect(); 
    };
  }, []);

  const joinRoom = () => {
    if (!inputPassword.trim()) {
      setError('A senha não pode estar vazia');
      return;
    }
    socketRef.current?.emit('viewer:join', { password: inputPassword });
  };

  const toggleFullScreen = () => {
    if (imgRef.current) {
      if (!document.fullscreenElement) {
        imgRef.current.requestFullscreen().catch(err => console.log(err));
      } else {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className="w-screen h-screen bg-black flex flex-col items-center justify-center overflow-hidden text-gray-200">
      
      {!roomState?.isStreaming ? (
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto border border-gray-800">
             <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </div>
          <h2 className="text-xl font-medium text-gray-500">Aguardando transmissão...</h2>
        </div>
      ) : !isAuthenticated ? (
        <div className="max-w-sm w-full mx-auto bg-gray-900/80 backdrop-blur-md p-8 rounded-2xl border border-gray-800 shadow-2xl">
          <h2 className="text-2xl font-bold text-white text-center mb-6">Sala Protegida</h2>
          <div className="space-y-4">
            <input 
              type="password" 
              placeholder="Digite a senha..."
              className="w-full bg-black border border-gray-700 p-4 rounded-xl outline-none focus:border-blue-500 text-center text-lg tracking-widest transition-colors"
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
            />
            {error && <p className="text-rose-500 text-sm text-center font-medium">{error}</p>}
            <button onClick={joinRoom} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all">
              Entrar
            </button>
          </div>
        </div>
      ) : (
        /* VÍDEO EM TELA CHEIA ABSOLUTA */
        <div className="relative w-full h-full group flex items-center justify-center bg-black">
          <img 
            ref={imgRef} 
            alt="Transmissão" 
            className="w-full h-full object-contain" 
          />
          
          {/* Botão Flutuante Inferior Direito */}
          <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button 
              onClick={toggleFullScreen} 
              className="bg-black/60 p-4 rounded-full backdrop-blur-lg border border-white/10 text-white hover:bg-black hover:scale-110 transition-all shadow-xl"
              title="Tela Cheia"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}