// Configurações que o transmissor define
export interface StreamConfig {
  fps: 30 | 60;
  hasPassword: boolean;
}

// O estado atual da sala que o servidor transmite
export interface RoomState {
  isStreaming: boolean;
  connectedCount: number;
  activeViewersCount: number;
  config: StreamConfig | null;
}

// Eventos que o Cliente (Transmissor ou Espectador) envia para o Servidor
export interface ClientToServerEvents {
  "host:start_stream": (config: StreamConfig, password?: string) => void;
  "host:stop_stream": () => void;
  "viewer:join": (password?: string) => void;
  "viewer:visibility_change": (isVisible: boolean) => void;
}

// Eventos que o Servidor envia para os Clientes
export interface ServerToClientEvents {
  "room:state_update": (state: RoomState) => void;
  "error": (message: string) => void;
}