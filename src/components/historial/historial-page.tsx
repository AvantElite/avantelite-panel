import { useState, useEffect, useRef } from "react"
import { api, authFetch } from "@/lib/api"
import { Search, MessageCircle, Tag, X, Plus, ChevronDown, ChevronUp, Lock, Clock, User, Mail } from "lucide-react"
import { cn } from "@/lib/utils"
import "../../avant-premium-theme.css"

interface Conversacion {
  token: string
  contacto_id: number
  nombre: string | null
  apellido: string | null
  email: string
  etiquetas: string[]
  chat_cerrado: boolean
  total_mensajes: number
  ultimo_mensaje: string | null
  ultima_fecha: string | null
  presupuesto_fecha: string
}

interface ChatMsg {
  sender: "cliente" | "tecnico"
  sender_nombre?: string
  mensaje: string
  archivo?: string
  created_at: string
}

const ETIQUETAS_PREDEFINIDAS = [
  { label: "Urgente",    color: "bg-red-500/15 text-red-400 border-red-500/30" },
  { label: "Resuelto",   color: "bg-green-500/15 text-green-400 border-green-500/30" },
  { label: "Pendiente",  color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  { label: "En espera",  color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  { label: "Garantía",   color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  { label: "Presupuesto aceptado", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
]

function etiquetaColor(label: string) {
  return ETIQUETAS_PREDEFINIDAS.find(e => e.label === label)?.color
    ?? "bg-primary/15 text-primary border-primary/30"
}

export function HistorialPage() {
  const [convs, setConvs]           = useState<Conversacion[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState("")
  const [filtroEtiqueta, setFiltroEtiqueta] = useState<string | null>(null)
  const [searchTag, setSearchTag] = useState("")
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [mensajes, setMensajes]     = useState<Record<string, ChatMsg[]>>({})
  const [loadingMsgs, setLoadingMsgs] = useState<string | null>(null)

  // Etiqueta editor
  const [editingToken, setEditingToken] = useState<string | null>(null)
  const [newTag, setNewTag]         = useState("")
  const tagInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    authFetch(api("chat/historial"))
      .then(r => r.json())
      .then(data => { setConvs(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const todasEtiquetas = Array.from(
    new Set(convs.flatMap(c => c.etiquetas))
  ).sort()

  const lista = convs.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || [c.nombre, c.apellido, c.email, c.ultimo_mensaje]
      .some(v => v?.toLowerCase().includes(q))
      || c.etiquetas.some(t => t.toLowerCase().includes(q))
    const matchTag = !filtroEtiqueta || c.etiquetas.includes(filtroEtiqueta)
    return matchSearch && matchTag
  })

  const toggleExpand = async (token: string) => {
    if (expanded === token) { setExpanded(null); return }
    setExpanded(token)
    if (mensajes[token]) return
    setLoadingMsgs(token)
    const r = await authFetch(`${api("chat")}?token=${encodeURIComponent(token)}`)
    const data = await r.json()
    setMensajes(prev => ({ ...prev, [token]: data.mensajes ?? data }))
    setLoadingMsgs(null)
  }

  const addEtiqueta = async (token: string, tag: string) => {
    tag = tag.trim()
    if (!tag) return
    const conv = convs.find(c => c.token === token)
    if (!conv || conv.etiquetas.includes(tag)) return
    const next = [...conv.etiquetas, tag]
    await saveEtiquetas(token, next)
  }

  const removeEtiqueta = async (token: string, tag: string) => {
    const conv = convs.find(c => c.token === token)
    if (!conv) return
    const next = conv.etiquetas.filter(e => e !== tag)
    await saveEtiquetas(token, next)
  }

  const saveEtiquetas = async (token: string, etiquetas: string[]) => {
    const res = await authFetch(api("chat/etiquetas"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, etiquetas })
    })
    const data = await res.json()
    if (data.success) {
      setConvs(prev => prev.map(c => c.token === token ? { ...c, etiquetas: data.etiquetas } : c))
    }
  }

  const displayName = (c: Conversacion) =>
    `${c.nombre ?? ""} ${c.apellido ?? ""}`.trim() || c.email

  return (
    <div className="flex min-h-[calc(100vh-60px)] flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 avant-premium-layout rounded-xl p-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight neon-title">Historial de Conversaciones</h2>
        <p className="text-muted-foreground mt-1">Todos los chats con clientes, clasificados por etiquetas.</p>
      </div>

      <div className="flex gap-4 items-start">

        {/* Sidebar etiquetas */}
        <div className="w-52 shrink-0 flex flex-col gap-1 rounded-xl border bg-card p-3 shadow-sm glass-panel sticky top-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground px-2 pb-2 border-b mb-1">Etiquetas</p>
          <div className="relative mb-1">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchTag}
              onChange={e => setSearchTag(e.target.value)}
              placeholder="Buscar etiqueta…"
              className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <button
            onClick={() => setFiltroEtiqueta(null)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors w-full text-left",
              !filtroEtiqueta ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <MessageCircle className="h-3.5 w-3.5 shrink-0" />
            Todas
            <span className="ml-auto text-xs opacity-60">{convs.length}</span>
          </button>
          {todasEtiquetas.filter(t => t.toLowerCase().includes(searchTag.toLowerCase())).map(tag => (
            <button
              key={tag}
              onClick={() => setFiltroEtiqueta(filtroEtiqueta === tag ? null : tag)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors w-full text-left",
                filtroEtiqueta === tag ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Tag className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{tag}</span>
              <span className="ml-auto text-xs opacity-60">
                {convs.filter(c => c.etiquetas.includes(tag)).length}
              </span>
            </button>
          ))}
          {todasEtiquetas.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-1">Sin etiquetas aún.</p>
          )}
        </div>

        {/* Lista conversaciones */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, email, mensaje o etiqueta..."
              className="h-10 w-full rounded-md border border-input bg-card pl-9 pr-4 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {loading ? (
            <div className="text-center py-16 text-muted-foreground animate-pulse">Cargando historial…</div>
          ) : lista.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No hay conversaciones{filtroEtiqueta ? ` con la etiqueta "${filtroEtiqueta}"` : ""}.</div>
          ) : lista.map(conv => (
            <div key={conv.token} className="rounded-xl border border-border/60 bg-card shadow-sm glass-panel overflow-hidden">

              {/* Cabecera de la conversación */}
              <div className="flex items-start gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground">{displayName(conv)}</span>
                    {conv.chat_cerrado && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground border border-border/50 rounded-full px-2 py-0.5">
                        <Lock className="h-2.5 w-2.5" /> Cerrado
                      </span>
                    )}
                    <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Clock className="h-3 w-3" />
                      {conv.ultima_fecha
                        ? new Date(conv.ultima_fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
                        : new Date(conv.presupuesto_fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Mail className="h-3 w-3" />
                    {conv.email}
                    <span className="mx-1 opacity-30">·</span>
                    <MessageCircle className="h-3 w-3" />
                    {conv.total_mensajes} mensaje{conv.total_mensajes !== 1 ? "s" : ""}
                  </div>
                  {conv.ultimo_mensaje && (
                    <p className="text-xs text-muted-foreground mt-1 truncate max-w-md">
                      "{conv.ultimo_mensaje}"
                    </p>
                  )}

                  {/* Etiquetas */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    {conv.etiquetas.map(tag => (
                      <span key={tag} className={cn("flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium", etiquetaColor(tag))}>
                        {tag}
                        <button
                          onClick={() => removeEtiqueta(conv.token, tag)}
                          className="opacity-60 hover:opacity-100 transition-opacity"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}

                    {/* Añadir etiqueta */}
                    {editingToken === conv.token ? (
                      <div className="flex items-center gap-1">
                        <input
                          ref={tagInputRef}
                          type="text"
                          value={newTag}
                          onChange={e => setNewTag(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") { addEtiqueta(conv.token, newTag); setNewTag(""); setEditingToken(null) }
                            if (e.key === "Escape") { setNewTag(""); setEditingToken(null) }
                          }}
                          placeholder="Nueva etiqueta…"
                          className="h-6 text-xs rounded border border-input bg-background px-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-32"
                          autoFocus
                        />
                        {/* Sugerencias predefinidas */}
                        <div className="flex gap-1 flex-wrap">
                          {ETIQUETAS_PREDEFINIDAS.filter(e => !conv.etiquetas.includes(e.label)).slice(0, 3).map(e => (
                            <button
                              key={e.label}
                              onClick={() => { addEtiqueta(conv.token, e.label); setEditingToken(null) }}
                              className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-medium hover:opacity-80 transition-opacity", e.color)}
                            >
                              {e.label}
                            </button>
                          ))}
                        </div>
                        <button onClick={() => { setNewTag(""); setEditingToken(null) }} className="text-muted-foreground hover:text-foreground">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingToken(conv.token); setTimeout(() => tagInputRef.current?.focus(), 50) }}
                        className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                      >
                        <Plus className="h-2.5 w-2.5" /> Etiqueta
                      </button>
                    )}
                  </div>
                </div>

                {/* Botón expandir */}
                <button
                  onClick={() => toggleExpand(conv.token)}
                  className="shrink-0 p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  {expanded === conv.token ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>

              {/* Mensajes expandidos */}
              {expanded === conv.token && (
                <div className="border-t border-border/50 bg-background/30 p-4 flex flex-col gap-3 max-h-72 overflow-y-auto">
                  {loadingMsgs === conv.token ? (
                    <p className="text-center text-xs text-muted-foreground py-4 animate-pulse">Cargando mensajes…</p>
                  ) : (mensajes[conv.token] ?? []).length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-4">Sin mensajes aún.</p>
                  ) : (mensajes[conv.token] ?? []).map((m, i) => (
                    <div key={i} className={cn("flex flex-col max-w-[65%]", m.sender === "tecnico" ? "self-end items-end" : "self-start items-start")}>
                      <div className={cn("rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                        m.sender === "tecnico"
                          ? "bg-primary/20 border border-primary/30 rounded-br-sm"
                          : "bg-muted/40 border border-border/50 rounded-bl-sm"
                      )}>
                        {m.mensaje && <p>{m.mensaje}</p>}
                        {m.archivo && (/\.(jpg|jpeg|png|webp|gif)$/i.test(m.archivo)
                          ? <img src={m.archivo} alt="adjunto" className="max-w-[180px] max-h-[140px] rounded-lg mt-1 cursor-pointer" onClick={() => window.open(m.archivo)} />
                          : <a href={m.archivo} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary text-xs mt-1 hover:underline">📄 {m.archivo.split("/").pop()}</a>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1">
                        {m.sender === "tecnico" ? "Técnico" : (m.sender_nombre || displayName(conv))}
                        {" · "}
                        {new Date(m.created_at).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
