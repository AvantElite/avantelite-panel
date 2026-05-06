import { useState, useEffect } from "react"
import { api, authFetch } from "@/lib/api"
import { Shield, Wrench, KeyRound, Trash2, ChevronDown, Check, X, LogOut, Plus, Settings2, LayoutDashboard, MessageSquare, History, BookOpen, BarChart2, Users, UserPlus, Brain } from "lucide-react"
import { cn } from "@/lib/utils"

const ALL_VIEWS = ["Dashboard", "Mensajes", "Historial", "Blog", "Analíticas", "Usuarios", "Contexto IA"]
const VIEW_ICONS: Record<string, React.ReactNode> = {
  Dashboard:     <LayoutDashboard className="h-3.5 w-3.5" />,
  Mensajes:      <MessageSquare   className="h-3.5 w-3.5" />,
  Historial:     <History         className="h-3.5 w-3.5" />,
  Blog:          <BookOpen        className="h-3.5 w-3.5" />,
  "Analíticas":  <BarChart2       className="h-3.5 w-3.5" />,
  Usuarios:      <Users           className="h-3.5 w-3.5" />,
  "Contexto IA": <Brain           className="h-3.5 w-3.5" />,
}

interface Usuario {
  id: number
  nombre: string
  email: string
  rol: string
  created_at: string
}

interface Rol {
  id: number
  nombre: string
  permisos: string[]
}


function rolColor(nombre: string) {
  if (nombre === "administrador") return "cyan"
  if (nombre === "tecnico") return "violet"
  const colors = ["amber", "emerald", "rose", "sky", "orange", "pink"]
  return colors[nombre.length % colors.length]
}

function RolBadgeStyle(nombre: string) {
  const c = rolColor(nombre)
  const map: Record<string, string> = {
    cyan:    "bg-gradient-to-r from-[#0057ff]/20 to-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] hover:border-[#00f0ff]/60 hover:shadow-[0_0_10px_rgba(0,240,255,0.15)]",
    violet:  "bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/30 text-violet-400 hover:border-violet-400/60 hover:shadow-[0_0_10px_rgba(139,92,246,0.15)]",
    amber:   "bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:border-amber-400/60",
    emerald: "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:border-emerald-400/60",
    rose:    "bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:border-rose-400/60",
    sky:     "bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:border-sky-400/60",
    orange:  "bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:border-orange-400/60",
    pink:    "bg-pink-500/10 border border-pink-500/30 text-pink-400 hover:border-pink-400/60",
  }
  return map[c] ?? map.violet
}

function RolIconBg(nombre: string) {
  const c = rolColor(nombre)
  const map: Record<string, string> = {
    cyan:    "bg-[#00f0ff]/10 text-[#00f0ff]",
    violet:  "bg-violet-500/10 text-violet-400",
    amber:   "bg-amber-500/10 text-amber-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
    rose:    "bg-rose-500/10 text-rose-400",
    sky:     "bg-sky-500/10 text-sky-400",
    orange:  "bg-orange-500/10 text-orange-400",
    pink:    "bg-pink-500/10 text-pink-400",
  }
  return map[c] ?? map.violet
}


export function UsuariosPage() {
  const [tab, setTab]               = useState<"usuarios" | "roles">("usuarios")
  const [usuarios, setUsuarios]     = useState<Usuario[]>([])
  const [roles, setRoles]           = useState<Rol[]>([])
  const [loading, setLoading]       = useState(true)
  const [notify, setNotify]         = useState<{ ok: boolean; msg: string } | null>(null)

  // Password reset
  const [pwId, setPwId]             = useState<number | null>(null)
  const [pwValue, setPwValue]       = useState("")
  const [pwLoading, setPwLoading]   = useState(false)

  // Crear usuario
  const [showNewUser, setShowNewUser]   = useState(false)
  const [newNombre, setNewNombre]       = useState("")
  const [newEmail, setNewEmail]         = useState("")
  const [newPassword, setNewPassword]   = useState("")
  const [newRol, setNewRol]             = useState("")
  const [newUserLoading, setNewUserLoading] = useState(false)

  // Rol editor
  const [editRol, setEditRol]       = useState<Rol | null>(null)
  const [newRolNombre, setNewRolNombre] = useState("")
  const [newRolPermisos, setNewRolPermisos] = useState<string[]>([])
  const [rolSaving, setRolSaving]   = useState(false)
  const [showNewRol, setShowNewRol] = useState(false)

  const toast = (ok: boolean, msg: string) => {
    setNotify({ ok, msg })
    setTimeout(() => setNotify(null), 3500)
  }

  const fetchAll = () => {
    setLoading(true)
    Promise.all([
      fetch(api("auth/usuarios"), { credentials: "include" }).then(r => r.json()),
      fetch(api("roles/listar"),   { credentials: "include" }).then(r => r.json()),
    ]).then(([u, r]) => {
      setUsuarios(Array.isArray(u) ? u : [])
      setRoles(Array.isArray(r) ? r.map((rol: Rol) => ({ ...rol, permisos: rol.permisos.map(p => p === "RAG" ? "Contexto IA" : p) })) : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])

  const handleRol = async (id: number, rol: string) => {
    const res  = await authFetch(api("auth/usuarios/rol"), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, rol })
    })
    const data = await res.json()
    if (data.success) { setUsuarios(prev => prev.map(u => u.id === id ? { ...u, rol } : u)); toast(true, "Rol actualizado.") }
    else toast(false, data.error ?? "Error al cambiar rol.")
  }

  const handlePassword = async (id: number) => {
    if (pwValue.length < 12) { toast(false, "Mínimo 12 caracteres."); return }
    setPwLoading(true)
    const res  = await authFetch(api("auth/usuarios/password"), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, password: pwValue })
    })
    const data = await res.json()
    if (data.success) { toast(true, "Contraseña actualizada."); setPwId(null); setPwValue("") }
    else toast(false, data.error ?? "Error.")
    setPwLoading(false)
  }

  const handleBorrarSesion = async (id: number, nombre: string) => {
    if (!confirm(`¿Cerrar la sesión activa de "${nombre}"?`)) return
    const res  = await authFetch(api("auth/usuarios/sesion"), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id })
    })
    const data = await res.json()
    if (data.success) toast(true, `Sesión de "${nombre}" cerrada.`)
    else toast(false, data.error ?? "Error.")
  }

  const handleEliminar = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar la cuenta de "${nombre}"? Esta acción no se puede deshacer.`)) return
    const res  = await authFetch(api("auth/usuarios/eliminar"), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id })
    })
    const data = await res.json()
    if (data.success) { setUsuarios(prev => prev.filter(u => u.id !== id)); toast(true, "Cuenta eliminada.") }
    else toast(false, data.error ?? "Error al eliminar.")
  }

  const handleCrearRol = async () => {
    if (!newRolNombre.trim()) { toast(false, "El nombre es obligatorio."); return }
    setRolSaving(true)
    const res  = await authFetch(api("roles/crear"), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre: newRolNombre.trim(), permisos: newRolPermisos })
    })
    const data = await res.json()
    if (data.success) {
      toast(true, "Rol creado.")
      setShowNewRol(false); setNewRolNombre(""); setNewRolPermisos([])
      fetchAll()
    } else toast(false, data.error ?? "Error al crear rol.")
    setRolSaving(false)
  }

  const handleGuardarRol = async (rol: Rol) => {
    setRolSaving(true)
    const res  = await authFetch(api("roles/actualizar"), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: rol.id, permisos: rol.permisos })
    })
    const data = await res.json()
    if (data.success) { toast(true, "Permisos actualizados."); setEditRol(null); fetchAll() }
    else toast(false, data.error ?? "Error.")
    setRolSaving(false)
  }

  const handleCrearUsuario = async () => {
    if (!newNombre.trim()) { toast(false, "El nombre es obligatorio."); return }
    if (!newEmail.trim())  { toast(false, "El email es obligatorio."); return }
    if (newPassword.length < 12) { toast(false, "Mínimo 12 caracteres en la contraseña."); return }
    if (!newRol) { toast(false, "Selecciona un rol."); return }
    setNewUserLoading(true)
    const res  = await authFetch(api("auth/register"), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: newNombre.trim(), email: newEmail.trim(), password: newPassword, rol: newRol })
    })
    const data = await res.json()
    if (data.success) {
      toast(true, "Usuario creado correctamente.")
      setShowNewUser(false); setNewNombre(""); setNewEmail(""); setNewPassword(""); setNewRol("")
      fetchAll()
    } else toast(false, data.error ?? "Error al crear usuario.")
    setNewUserLoading(false)
  }

  const handleEliminarRol = async (rol: Rol) => {
    if (!confirm(`¿Eliminar el rol "${rol.nombre}"?`)) return
    const res  = await authFetch(api("roles/eliminar"), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: rol.id })
    })
    const data = await res.json()
    if (data.success) { toast(true, "Rol eliminado."); fetchAll() }
    else toast(false, data.error ?? "Error.")
  }

  return (
    <div className="flex min-h-[calc(100vh-60px)] flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 avant-premium-layout rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight neon-title">Gestión de Usuarios</h2>
          <p className="text-muted-foreground mt-1">Cuentas y roles de AvantPanel.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border/40 bg-muted/20 p-1 w-fit">
        {(["usuarios", "roles"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-200",
              tab === t ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "usuarios" ? "Usuarios" : "Roles"}
          </button>
        ))}
      </div>

      {/* Toast */}
      {notify && (
        <div className={cn("flex items-center gap-2 rounded-xl border px-4 py-3 text-sm", notify.ok ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-red-500/30 bg-red-500/10 text-red-400")}>
          {notify.ok ? <Check className="h-4 w-4 shrink-0" /> : <X className="h-4 w-4 shrink-0" />}
          {notify.msg}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-muted-foreground animate-pulse">Cargando…</div>
      ) : tab === "usuarios" ? (
        /* ── Tabla usuarios ── */
        <div className="space-y-3">
          {/* Formulario crear usuario */}
          {showNewUser && (
            <div className="rounded-xl border border-border/60 bg-card glass-panel p-5 space-y-4">
              <p className="text-sm font-semibold text-foreground">Nuevo usuario</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nombre</label>
                  <input value={newNombre} onChange={e => setNewNombre(e.target.value)} placeholder="Nombre completo"
                    maxLength={100}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                  <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@ejemplo.com"
                    maxLength={254}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Contraseña</label>
                  <input type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mín. 12 caracteres"
                    maxLength={128}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Rol</label>
                  <select value={newRol} onChange={e => setNewRol(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option value="">Seleccionar rol…</option>
                    {roles.map(r => <option key={r.id} value={r.nombre}>{r.nombre.charAt(0).toUpperCase() + r.nombre.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCrearUsuario} disabled={newUserLoading}
                  className="h-9 px-4 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm hover:bg-primary/20 transition-colors disabled:opacity-50">
                  {newUserLoading ? "Creando…" : "Crear usuario"}
                </button>
                <button onClick={() => { setShowNewUser(false); setNewNombre(""); setNewEmail(""); setNewPassword(""); setNewRol("") }}
                  className="h-9 px-4 rounded-lg border border-border/40 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}

        <div className="rounded-xl border border-border/60 bg-card glass-panel" style={{ overflow: "visible" }}>
          <div className="grid grid-cols-[1fr_1fr_180px_auto] gap-4 px-6 py-3 border-b border-border/40 text-xs uppercase tracking-wider text-muted-foreground">
            <span>Nombre</span><span>Email</span><span>Rol</span>
            <span>
              <button onClick={() => setShowNewUser(v => !v)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors">
                <UserPlus className="h-3.5 w-3.5" /> Nuevo usuario
              </button>
            </span>
          </div>

          {usuarios.map(u => (
            <div key={u.id} className="border-b border-border/30 last:border-0">
              <div className="grid grid-cols-[1fr_1fr_180px_auto] gap-4 px-6 py-4 items-center">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-[#0057ff] to-[#00f0ff] p-[1px] shrink-0">
                    <div className="flex h-full w-full items-center justify-center rounded-[7px] bg-[#0B0F19]">
                      <span className="text-xs font-black text-[#00f0ff]">
                        {u.nombre.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{u.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                <div className="relative">
                  <select
                    value={u.rol}
                    onChange={e => handleRol(u.id, e.target.value)}
                    className={cn(
                      "appearance-none rounded-full pl-7 pr-6 py-1.5 text-xs font-semibold border cursor-pointer transition-all duration-200 shadow-sm bg-transparent outline-none",
                      RolBadgeStyle(u.rol)
                    )}
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.nombre} className="bg-[#0B0F19] text-foreground">
                        {r.nombre.charAt(0).toUpperCase() + r.nombre.slice(1)}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
                    {u.rol === "administrador" ? <Shield className="h-3 w-3" /> : <Wrench className="h-3 w-3" />}
                  </span>
                  <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 opacity-60" />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setPwId(pwId === u.id ? null : u.id); setPwValue("") }} title="Cambiar contraseña" className="p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                    <KeyRound className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleBorrarSesion(u.id, u.nombre)} title="Borrar sesión activa" className="p-2 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <LogOut className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleEliminar(u.id, u.nombre)} title="Eliminar cuenta" className="p-2 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {pwId === u.id && (
                <div className="flex items-center gap-3 px-6 pb-4">
                  <input
                    type="password"
                    value={pwValue}
                    onChange={e => setPwValue(e.target.value)}
                    placeholder="Nueva contraseña (mín. 8 caracteres)"
                    autoComplete="new-password"
                    maxLength={128}
                    className="h-9 flex-1 max-w-xs rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    onKeyDown={e => e.key === "Enter" && handlePassword(u.id)}
                  />
                  <button onClick={() => handlePassword(u.id)} disabled={pwLoading} className="h-9 px-4 rounded-md bg-primary/10 border border-primary/30 text-primary text-sm hover:bg-primary/20 transition-colors disabled:opacity-50">
                    {pwLoading ? "Guardando…" : "Guardar"}
                  </button>
                  <button onClick={() => { setPwId(null); setPwValue("") }} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {usuarios.length === 0 && (
            <div className="py-16 text-center text-muted-foreground text-sm">No hay usuarios registrados.</div>
          )}
        </div>
        </div>
      ) : (
        /* ── Gestión de roles ── */
        <div className="space-y-3">
          {roles.map(rol => (
            <div key={rol.id} className="rounded-xl border border-border/60 bg-card glass-panel p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", RolIconBg(rol.nombre))}>
                    {rol.nombre === "administrador" ? <Shield className="h-3.5 w-3.5" /> : <Wrench className="h-3.5 w-3.5" />}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{rol.nombre.charAt(0).toUpperCase() + rol.nombre.slice(1)}</p>
                    <p className="text-xs text-muted-foreground">{usuarios.filter(u => u.rol === rol.nombre).length} usuario(s)</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {editRol?.id === rol.id ? (
                    <>
                      <button onClick={() => handleGuardarRol(editRol)} disabled={rolSaving} className="h-8 px-3 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs hover:bg-primary/20 transition-colors disabled:opacity-50">
                        {rolSaving ? "Guardando…" : "Guardar"}
                      </button>
                      <button onClick={() => setEditRol(null)} className="h-8 px-3 rounded-lg border border-border/40 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditRol({ ...rol })} className="h-8 px-3 rounded-lg border border-border/40 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors flex items-center gap-1.5">
                        <Settings2 className="h-3.5 w-3.5" /> Editar permisos
                      </button>
                      {rol.nombre !== "administrador" && (
                        <button onClick={() => handleEliminarRol(rol)} className="h-8 px-3 rounded-lg border border-red-500/20 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {ALL_VIEWS.map(view => {
                  const active = editRol?.id === rol.id
                    ? editRol.permisos.includes(view)
                    : rol.permisos.includes(view)
                  const toggle = () => {
                    if (!editRol || editRol.id !== rol.id) return
                    setEditRol(prev => prev ? {
                      ...prev,
                      permisos: prev.permisos.includes(view)
                        ? prev.permisos.filter(p => p !== view)
                        : [...prev.permisos, view]
                    } : prev)
                  }
                  return (
                    <button
                      key={view}
                      onClick={toggle}
                      disabled={editRol?.id !== rol.id}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-all duration-150",
                        active
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-muted/20 border-border/30 text-muted-foreground",
                        editRol?.id === rol.id && "cursor-pointer hover:opacity-80",
                        editRol?.id !== rol.id && "cursor-default"
                      )}
                    >
                      {VIEW_ICONS[view]}
                      {view}
                      {active && <Check className="h-3 w-3 ml-0.5" />}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Crear nuevo rol */}
          {showNewRol ? (
            <div className="rounded-xl border border-border/60 bg-card glass-panel p-5 space-y-4">
              <p className="text-sm font-semibold text-foreground">Nuevo rol</p>
              <input
                value={newRolNombre}
                onChange={e => setNewRolNombre(e.target.value)}
                placeholder="Nombre del rol"
                maxLength={50}
              className="h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <div className="flex flex-wrap gap-2">
                {ALL_VIEWS.map(view => {
                  const active = newRolPermisos.includes(view)
                  return (
                    <button
                      key={view}
                      onClick={() => setNewRolPermisos(prev => active ? prev.filter(p => p !== view) : [...prev, view])}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-all duration-150 cursor-pointer hover:opacity-80",
                        active ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/20 border-border/30 text-muted-foreground"
                      )}
                    >
                      {VIEW_ICONS[view]}
                      {view}
                      {active && <Check className="h-3 w-3 ml-0.5" />}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <button onClick={handleCrearRol} disabled={rolSaving} className="h-9 px-4 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm hover:bg-primary/20 transition-colors disabled:opacity-50">
                  {rolSaving ? "Creando…" : "Crear rol"}
                </button>
                <button onClick={() => { setShowNewRol(false); setNewRolNombre(""); setNewRolPermisos([]) }} className="h-9 px-4 rounded-lg border border-border/40 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewRol(true)}
              className="flex items-center gap-2 rounded-xl border border-dashed border-border/40 px-5 py-4 text-sm text-muted-foreground hover:text-foreground hover:border-border/70 transition-all w-full"
            >
              <Plus className="h-4 w-4" /> Crear nuevo rol
            </button>
          )}
        </div>
      )}
    </div>
  )
}
