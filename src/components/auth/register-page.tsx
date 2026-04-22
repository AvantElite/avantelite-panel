import { useState } from "react"
import { Eye, EyeOff, UserPlus } from "lucide-react"

interface Props {
  onGoLogin: () => void
  onRegistered: () => void
}

export function RegisterPage({ onGoLogin, onRegistered }: Props) {
  const [nombre, setNombre]     = useState("")
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm]   = useState("")
  const [rol, setRol]           = useState<"administrador" | "tecnico">("tecnico")
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError("Las contraseñas no coinciden."); return }
    if (password.length < 6)  { setError("La contraseña debe tener al menos 6 caracteres."); return }
    setLoading(true)
    try {
      const res  = await fetch("http://localhost/backendavant/api.php?r=auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, password, rol }),
      })
      const data = await res.json()
      if (data.success) {
        onRegistered()
      } else {
        setError(data.error ?? "Error al registrar.")
      }
    } catch {
      setError("No se pudo conectar con el servidor.")
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center avant-premium-layout p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/src/assets/logo.svg" alt="AvantService" className="h-12 w-12 mb-3" />
          <h1 className="text-2xl font-bold"><span className="neon-title">Avant</span>Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">Panel de administración</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card shadow-xl glass-panel p-8">
          <h2 className="text-lg font-semibold text-foreground mb-6">Crear cuenta</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Nombre completo</label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
                placeholder="Juan García"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="juan@avantservice.com"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Rol</label>
              <div className="grid grid-cols-2 gap-2">
                {(["administrador", "tecnico"] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRol(r)}
                    className={`h-10 rounded-md border text-sm font-medium transition-colors capitalize ${
                      rol === r
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input bg-background text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {rol === "administrador"
                  ? "Acceso completo a todas las secciones."
                  : "Acceso a Mensajes e Historial."}
              </p>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Contraseña</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Mínimo 6 caracteres"
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

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Confirmar contraseña</label>
              <input
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                placeholder="Repite la contraseña"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white btn-premium disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              <UserPlus className="h-4 w-4" />
              {loading ? "Registrando…" : "Crear cuenta"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            ¿Ya tienes cuenta?{" "}
            <button onClick={onGoLogin} className="text-primary hover:underline">
              Inicia sesión
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
