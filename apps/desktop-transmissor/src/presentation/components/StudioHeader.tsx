import { Activity, Radio, Square, Globe } from 'lucide-react'

export const StudioHeader = ({
  isConnected,
  isStreaming,
  networkName,
  serverIp,
  serverPort,
  onStopStream,
}: {
  isConnected: boolean
  isStreaming: boolean
  networkName?: string
  serverIp?: string
  serverPort?: number
  onStopStream?: () => void
}) => {
  const showAddress = isConnected && serverIp && serverIp !== 'Carregando...'

  return (
    <header
      className="relative z-50 flex items-center justify-between px-5 py-2.5"
      style={{
        borderBottom: '1px solid var(--vs-border)',
        background: 'rgba(10,10,15,0.9)',
        backdropFilter: 'blur(20px)',
        minHeight: '52px',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div
          className="relative flex items-center justify-center w-8 h-8 rounded-xl font-black text-xs text-white"
          style={{
            background: 'linear-gradient(135deg, #6366F1, #4338CA)',
            boxShadow: '0 0 14px rgba(99,102,241,0.5)',
          }}
        >
          Vs
        </div>
        <div>
          <h1 className="text-sm font-bold leading-none tracking-tight text-white">
            ViewSync <span className="font-light" style={{ color: 'var(--vs-neon)' }}>Studio</span>
          </h1>
        </div>
      </div>

      {/* Center — Server Address (shown as soon as server is on) */}
      {showAddress && !isStreaming && (
        <div
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-xl"
          style={{
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid var(--vs-border-accent)',
          }}
        >
          <Globe className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--vs-accent)' }} />
          <span className="text-xs font-bold" style={{ color: 'var(--vs-text-muted)' }}>
            Acesso:{' '}
          </span>
          <span
            className="text-xs font-black"
            style={{ color: 'var(--vs-neon)', fontFamily: 'var(--font-mono)' }}
          >
            http://{serverIp}:{serverPort}
          </span>
        </div>
      )}

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Network name */}
        {networkName && networkName !== 'Detectando...' && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--vs-border)',
              color: 'var(--vs-text-muted)',
            }}
          >
            <Radio className="w-3 h-3" style={{ color: 'var(--vs-accent)' }} />
            {networkName}
          </div>
        )}

        {/* Status pill */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider"
          style={{
            background: isConnected ? 'rgba(99,102,241,0.08)' : 'rgba(244,63,94,0.08)',
            border: `1px solid ${isConnected ? 'rgba(99,102,241,0.25)' : 'rgba(244,63,94,0.25)'}`,
            color: isConnected ? 'var(--vs-neon)' : 'var(--vs-danger)',
          }}
        >
          <Activity className="w-3 h-3" />
          {isConnected ? 'Server On' : 'Conectando'}
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: isConnected ? 'var(--vs-accent)' : 'var(--vs-danger)',
              boxShadow: isConnected ? '0 0 6px var(--vs-accent-glow)' : 'none',
            }}
          />
        </div>

        {/* Stop button — only shown when streaming */}
        {isStreaming && onStopStream && (
          <button
            onClick={onStopStream}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all duration-200 active:scale-95"
            style={{
              background: 'rgba(244,63,94,0.12)',
              border: '1px solid rgba(244,63,94,0.3)',
              color: 'var(--vs-danger)',
            }}
          >
            <Square className="w-3 h-3 fill-current" />
            Encerrar
          </button>
        )}
      </div>
    </header>
  )
}
