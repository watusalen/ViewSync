import { useTransmissorController } from '../hooks/useTransmissorController'
import { SourceSelectionGrid } from '../components/SourceSelectionGrid'
import { StreamSettingsBar } from '../components/StreamSettingsBar'
import { StreamingPanel } from '../components/StreamingPanel'
import { StudioHeader } from '../components/StudioHeader'

export const TransmissorPage = () => {
  const {
    copied,
    copyUrl,
    fps,
    isConnected,
    isStarting,
    isStreaming,
    networkName,
    onStartStream,
    onStopStream,
    password,
    roomState,
    selectedSource,
    serverIp,
    serverPort,
    setFps,
    setPassword,
    setSelectedSource,
    sources,
    videoRef,
  } = useTransmissorController()

  return (
    <div
      className="flex flex-col h-screen select-none"
      style={{ background: 'var(--vs-bg-base)', color: 'var(--vs-text)' }}
    >
      {/* Header — always visible; shows IP and stop button when streaming */}
      <StudioHeader
        isConnected={isConnected}
        isStreaming={isStreaming}
        networkName={networkName}
        serverIp={serverIp}
        serverPort={serverPort}
        onStopStream={onStopStream}
      />

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-5xl mx-auto space-y-4">

          {/* Settings bar — hides itself when isStreaming */}
          <StreamSettingsBar
            fps={fps}
            password={password}
            isStreaming={isStreaming}
            isStarting={isStarting}
            canStart={!!selectedSource}
            onChangeFps={setFps}
            onChangePassword={setPassword}
            onStartStream={onStartStream}
          />

          {/* Main content */}
          {isStreaming ? (
            <StreamingPanel
              copied={copied}
              fps={fps}
              networkName={networkName}
              password={password}
              roomState={roomState}
              selectedSource={selectedSource}
              serverIp={serverIp}
              serverPort={serverPort}
              sources={sources}
              videoRef={videoRef}
              onCopyUrl={copyUrl}
              onSelectSource={setSelectedSource}
            />
          ) : (
            <SourceSelectionGrid
              sources={sources}
              selectedSource={selectedSource}
              onSelectSource={setSelectedSource}
            />
          )}
        </div>
      </main>

      <footer
        className="px-5 py-2 text-center text-[9px] font-bold uppercase tracking-[0.3em]"
        style={{
          color: 'var(--vs-text-dim)',
          borderTop: '1px solid var(--vs-border)',
          background: 'rgba(0,0,0,0.2)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        © 2026 ViewSync Studio &bull; by Kellviny
      </footer>
    </div>
  )
}
