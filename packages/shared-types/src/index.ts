// Configurações que o transmissor define
export interface StreamConfig {
  fps: 30 | 60;
  hasPassword: boolean;
  producerId?: string;
}

// O estado atual da sala que o servidor transmite
export interface RoomState {
  isStreaming: boolean;
  connectedCount: number;
  activeViewersCount: number;
  config: StreamConfig | null;
}

// Eventos de Sinalização mediasoup
export interface MediasoupEvents {
  "mediasoup:getRouterRtpCapabilities": (callback: (rtpCapabilities: any) => void) => void;
  "mediasoup:createWebRtcTransport": (payload: { direction: 'send' | 'recv' }, callback: (params: any) => void) => void;
  "mediasoup:connectWebRtcTransport": (payload: { transportId: string, dtlsParameters: any }, callback: () => void) => void;
  "mediasoup:produce": (payload: { transportId: string, kind: string, rtpParameters: any }, callback: (data: { id: string }) => void) => void;
  "mediasoup:consume": (payload: { transportId: string, producerId: string, rtpCapabilities: any }, callback: (data: any) => void) => void;
  "mediasoup:resume": (payload: { transportId: string, consumerId: string }, callback: () => void) => void;
}

// Eventos que o Cliente (Transmissor ou Espectador) envia para o Servidor
export interface ClientToServerEvents extends MediasoupEvents {
  "host:start_stream": (payload: { config: StreamConfig, password?: string }) => void;
  "host:stop_stream": () => void;
  "host:frame"?: (frameData: string) => void; // Legado para fallback se necessário
  "viewer:join": (payload: { password?: string }) => void;
  "viewer:visibility_change": (isVisible: boolean) => void;
}

// Eventos que o Servidor envia para os Clientes
export interface ServerToClientEvents {
  "room:state_update": (state: RoomState & { hostId: string | null }) => void;
  "room:frame"?: (frameData: string) => void; // Legado
  "mediasoup:newProducer": (payload: { producerId: string }) => void;
  "error": (message: string) => void;
  "server:info": (data: { ip: string, network: string, port: number }) => void;
  "viewer:authorized": () => void;
}