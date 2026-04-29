import { useState, useRef } from "react"
import { Eye, EyeOff, LogIn } from "lucide-react"
import { api } from "@/lib/api"

interface Props {
  onLogin: (user: AuthUser) => void
}

export interface AuthUser {
  id: number
  nombre: string
  email: string
  rol: string
  permisos: string[]
}

const MAX_ATTEMPTS  = 5
const LOCKOUT_MS    = 60_000

export function LoginPage({ onLogin }: Props) {
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const attempts = useRef(0)

  const isLocked = () => lockedUntil !== null && Date.now() < lockedUntil

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isLocked()) {
      const secsLeft = Math.ceil(((lockedUntil ?? 0) - Date.now()) / 1000)
      setError(`Demasiados intentos. Espera ${secsLeft} segundos.`)
      return
    }

    setError(null)
    setLoading(true)
    try {
      const res  = await fetch(api("auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (data.success) {
        attempts.current = 0
        if (Array.isArray(data.user.permisos)) {
          data.user.permisos = data.user.permisos.map((p: string) => p === "RAG" ? "Contexto IA" : p)
        }
        onLogin(data.user)
      } else {
        attempts.current += 1
        if (attempts.current >= MAX_ATTEMPTS) {
          const until = Date.now() + LOCKOUT_MS
          setLockedUntil(until)
          setError(`Demasiados intentos fallidos. Bloqueado por 60 segundos.`)
          attempts.current = 0
        } else {
          setError(data.error ?? "Credenciales incorrectas.")
        }
      }
    } catch {
      setError("No se pudo conectar con el servidor.")
    }
    setLoading(false)
  }

  const locked = isLocked()

  return (
    <div className="flex min-h-screen items-center justify-center avant-premium-layout p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.svg" alt="AvantService" className="h-12 w-12 mb-3" />
          <h1 className="text-2xl font-bold"><span className="neon-title">Avant</span>Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">Panel de administración</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card shadow-xl glass-panel p-8">
          <h2 className="text-lg font-semibold text-foreground mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                maxLength={254}
                autoComplete="off"
                placeholder="admin@avantservice.com"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Contraseña</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 pr-10 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || locked}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white btn-premium disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              <LogIn className="h-4 w-4" />
              {locked ? "Bloqueado…" : loading ? "Entrando…" : "Entrar"}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
