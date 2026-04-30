import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { RoomState, StreamConfig } from '@mirror/shared-types';

@WebSocketGateway({ cors: { origin: '*' } })
export class SignalingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private roomState: RoomState = {
    isStreaming: false,
    connectedCount: 0,
    activeViewersCount: 0,
    config: null,
  };

  private currentHostId: string | null = null;
  private roomPassword = '';

  handleConnection(client: Socket) {
    this.roomState.connectedCount++;
    this.broadcastState();
  }

  handleDisconnect(client: Socket) {
    this.roomState.connectedCount--;
    if (client.id === this.currentHostId) {
      this.stopStream(client);
    } else {
      this.broadcastState();
    }
  }

  @SubscribeMessage('host:start_stream')
  startStream(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { config: StreamConfig; password?: string },
  ) {
    this.currentHostId = client.id;
    this.roomPassword = payload.password || '';
    this.roomState.isStreaming = true;
    this.roomState.config = payload.config;
    this.broadcastState();
  }

  @SubscribeMessage('host:stop_stream')
  stopStream(@ConnectedSocket() client: Socket) {
    if (client.id !== this.currentHostId) return;
    this.currentHostId = null;
    this.roomState.isStreaming = false;
    this.roomState.config = null;
    this.roomState.activeViewersCount = 0;
    this.broadcastState();
  }

  // --- NOVA LÓGICA DE VÍDEO OFFLINE (FRAME BROADCAST) ---
  @SubscribeMessage('host:frame')
  handleFrame(@ConnectedSocket() client: Socket, @MessageBody() frameData: string) {
    // Apenas o Host pode enviar frames de vídeo
    if (client.id !== this.currentHostId) return;
    
    // Dispara a imagem como um megafone para todos os alunos (exceto para o próprio host)
    client.broadcast.emit('room:frame', frameData);
  }

  // --- CONTROLE DE ALUNOS ---
  @SubscribeMessage('viewer:join')
  handleViewerJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { password?: string }
  ) {
    if (this.roomState.config?.hasPassword && payload.password !== this.roomPassword) {
      client.emit('error', 'Senha incorreta. Tente novamente.');
      return;
    }
    client.emit('viewer:authorized');
  }

  @SubscribeMessage('viewer:visibility_change')
  handleVisibility(@ConnectedSocket() client: Socket, @MessageBody() isVisible: boolean) {
    if (isVisible) this.roomState.activeViewersCount++;
    else if (this.roomState.activeViewersCount > 0) this.roomState.activeViewersCount--;
    this.broadcastState();
  }

  private broadcastState() {
    this.server.emit('room:state_update', { ...this.roomState, hostId: this.currentHostId });
  }
}