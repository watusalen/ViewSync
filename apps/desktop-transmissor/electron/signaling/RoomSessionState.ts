import type {
  HostStartStreamPayload,
  RoomPublicState,
  StreamConfig,
  ViewerJoinPayload,
  ViewerPresence,
} from './types'

type RoomRuntimeState = {
  isStreaming: boolean
  config: StreamConfig | null
}

export class RoomSessionState {
  private roomState: RoomRuntimeState = {
    isStreaming: false,
    config: null,
  }

  private currentHostId: string | null = null
  private roomPassword = ''
  private activeViewers = new Set<string>()
  private viewerIdentities = new Map<string, { enrollment: string; name: string }>()

  public onSocketConnected(socketId: string): void {
    void socketId
  }

  public isHostSocket(socketId: string): boolean {
    return this.currentHostId === socketId
  }

  public onHostStartStream(socketId: string, payload: HostStartStreamPayload): void {
    this.currentHostId = socketId
    this.activeViewers.delete(socketId)
    this.roomPassword = payload.password || ''
    this.roomState.isStreaming = true
    this.roomState.config = payload.config || null
  }

  public onHostStopStream(socketId: string): boolean {
    if (!this.isHostSocket(socketId)) return false
    this.resetRoom()
    return true
  }

  public onSocketDisconnect(socketId: string): void {
    this.activeViewers.delete(socketId)
    this.viewerIdentities.delete(socketId)

    if (this.currentHostId === socketId) {
      this.resetRoom()
    }
  }

  public registerViewerIdentity(socketId: string, enrollment: string, name: string): void {
    if (this.isHostSocket(socketId)) return

    this.viewerIdentities.set(socketId, {
      enrollment,
      name,
    })
  }

  public getViewerIdentity(socketId: string): { enrollment: string; name: string } | null {
    return this.viewerIdentities.get(socketId) || null
  }

  public isViewerAuthorized(payload: ViewerJoinPayload): boolean {
    if (!this.roomState.config?.hasPassword) return true
    return payload.password === this.roomPassword
  }

  public setViewerVisibility(socketId: string, isVisible: boolean): void {
    if (this.isHostSocket(socketId)) return
    if (!this.viewerIdentities.has(socketId)) return
    if (isVisible) this.activeViewers.add(socketId)
    else this.activeViewers.delete(socketId)
  }

  private buildViewerPresenceList(): ViewerPresence[] {
    return [...this.viewerIdentities.entries()].map(([socketId, identity]) => {
      return {
        socketId,
        enrollment: identity.enrollment,
        name: identity.name,
        isViewing: this.activeViewers.has(socketId),
        isAuthorized: true,
      }
    })
  }

  public buildPublicState(): RoomPublicState {
    const viewers = this.buildViewerPresenceList()

    return {
      isStreaming: this.roomState.isStreaming,
      connectedCount: viewers.length,
      activeViewersCount: this.activeViewers.size,
      config: this.roomState.config,
      hostId: this.currentHostId,
      viewers,
    }
  }

  private resetRoom(): void {
    this.currentHostId = null
    this.roomPassword = ''
    this.roomState.isStreaming = false
    this.roomState.config = null
    this.activeViewers.clear()
    this.viewerIdentities.clear()
  }
}