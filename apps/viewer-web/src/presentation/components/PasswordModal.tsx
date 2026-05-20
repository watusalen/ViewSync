import { AlertCircle, Lock, Unlock } from 'lucide-react'

export const PasswordModal = ({
  inputPassword,
  error,
  onChange,
  onJoin,
}: {
  inputPassword: string
  error: string
  onChange: (v: string) => void
  onJoin: () => void
}) => (
  <div className="w-full max-w-sm mx-auto px-5 animate-scale-in">
    <div className="rounded-3xl p-8 space-y-8"
      style={{
        background: 'rgba(15,15,26,0.9)',
        backdropFilter: 'blur(30px)',
        border: '1px solid var(--vs-border)',
        boxShadow: '0 25px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
      }}>

      {/* Icon */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
          style={{
            background: 'var(--vs-accent-dim)',
            border: '1px solid var(--vs-border-accent)',
            boxShadow: 'var(--vs-glow-sm)',
          }}>
          <Lock className="w-7 h-7" style={{ color: 'var(--vs-neon)' }} />
        </div>
        <h2 className="text-xl font-black text-white tracking-tight">Sala Protegida</h2>
        <p className="text-sm mt-1.5 font-medium" style={{ color: 'var(--vs-text-muted)' }}>
          Insira a senha de acesso para entrar
        </p>
      </div>

      {/* Input */}
      <div className="space-y-4">
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--vs-text-muted)' }} />
          <input
            type="password"
            placeholder="••••••••"
            className="vs-input pl-11 text-center tracking-[0.35em] text-lg"
            value={inputPassword}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onJoin()}
            autoFocus
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 justify-center py-2.5 px-4 rounded-xl text-xs font-bold animate-fade-up"
            style={{
              background: 'rgba(244,63,94,0.08)',
              border: '1px solid rgba(244,63,94,0.2)',
              color: 'var(--vs-danger)',
            }}>
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={onJoin}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-black text-sm text-white cursor-pointer transition-all duration-200 active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #6366F1, #4338CA)',
            boxShadow: 'var(--vs-glow-md)',
          }}>
          <Unlock className="w-4 h-4" />
          ENTRAR AGORA
        </button>
      </div>
    </div>
  </div>
)
