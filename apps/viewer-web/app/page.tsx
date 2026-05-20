'use client';

import { useViewerController } from '../src/presentation/hooks/useViewerController'
import { ViewerHeader } from '../src/presentation/components/ViewerHeader'
import { WaitingScreen } from '../src/presentation/components/WaitingScreen'
import { PasswordModal } from '../src/presentation/components/PasswordModal'
import { VideoPlayer } from '../src/presentation/components/VideoPlayer'
import { ViewerIdentityModal } from '../src/presentation/components/ViewerIdentityModal'

export default function ViewerPage() {
  const {
    isConnected,
    networkName,
    roomState,
    isAuthenticated,
    hasViewerIdentity,
    viewerName,
    setViewerName,
    viewerEnrollment,
    setViewerEnrollment,
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
  } = useViewerController()

  const toggleOverlays = () => {
    document.getElementById('floating-controls')?.classList.toggle('opacity-100')
    document.getElementById('status-overlay')?.classList.toggle('opacity-100')
  }

  return (
    <div className="fixed inset-0 bg-[#050506] flex flex-col items-center justify-center overflow-hidden text-gray-200 font-sans select-none touch-none">

      {!isFullScreen && (
        <ViewerHeader
          isConnected={isConnected}
          isStreaming={roomState?.isStreaming ?? false}
          networkName={networkName}
        />
      )}

      {!hasViewerIdentity ? (
        <ViewerIdentityModal
          viewerEnrollment={viewerEnrollment}
          viewerName={viewerName}
          error={identityError}
          onEnrollmentChange={setViewerEnrollment}
          onNameChange={setViewerName}
          onContinue={submitViewerIdentity}
        />
      ) : !roomState?.isStreaming ? (
        <WaitingScreen />
      ) : !isAuthenticated ? (
        <PasswordModal
          inputPassword={inputPassword}
          error={error}
          onChange={setInputPassword}
          onJoin={joinRoom}
        />
      ) : (
        <VideoPlayer
          videoRef={videoRef}
          containerRef={containerRef}
          connectedCount={roomState?.connectedCount ?? 0}
          isFullScreen={isFullScreen}
          needsForcePlay={needsForcePlay}
          onToggleFullScreen={toggleFullScreen}
          onForcePlay={forcePlay}
          onContainerClick={toggleOverlays}
        />
      )}

      {!isFullScreen && (
        <footer className="absolute bottom-4 text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] pointer-events-none text-center px-4 w-full">
          ViewSync SFU &bull; By Kellviny
        </footer>
      )}
    </div>
  );
}
