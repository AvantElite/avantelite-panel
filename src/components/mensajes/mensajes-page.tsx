import { useState, useEffect, useRef } from "react"
import { api, authFetch } from "@/lib/api"
import { Search, Mail, Reply, Trash2, Clock, CheckCircle2, User, Phone, Package, Tag, Settings, FileText, Plus, X, Send, XCircle, MessageCircle, FolderOpen, Lock, Sparkles, Zap, PanelRightOpen, PanelRightClose, BookOpen } from "lucide-react"

const ETIQUETAS_PREDEFINIDAS = [
  { label: "Urgente",    color: "bg-red-500/15 text-red-400 border-red-500/30" },
  { label: "Resuelto",   color: "bg-green-500/15 text-green-400 border-green-500/30" },
  { label: "Pendiente",  color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  { label: "En espera",  color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  { label: "Garantía",   color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  { label: "Presupuesto aceptado", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
]
function etiquetaColor(label: string) {
  return ETIQUETAS_PREDEFINIDAS.find(e => e.label === label)?.color ?? "bg-primary/15 text-primary border-primary/30"
}
import { cn } from "@/lib/utils"
import "../../avant-premium-theme.css"

interface Contacto {
  id: number;
  nombre: string | null;
  apellido: string | null;
  email: string;
  telefono: string | null;
  producto: string | null;
  problema: string | null;
  mensaje: string;
  origen: string;
  fecha_creacion: string;
  leido: boolean;
  dificultad: "facil" | "medio" | "dificil" | null;
  tipo: "formulario" | "diy";
  chat_token: string | null;
  presupuesto_estado: string | null;
  chat_cerrado?: boolean;
  etiquetas?: string[];
}

const DIFICULTAD_LABEL = { facil: "Fácil", medio: "Medio", dificil: "Difícil" } as const
const DIFICULTAD_COLOR = {
  facil:   "bg-green-500/15 text-green-400 border-green-500/30",
  medio:   "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  dificil: "bg-red-500/15 text-red-400 border-red-500/30",
} as const

interface LineaPresupuesto {
  id: number
  descripcion: string
  precio: string
}

type Tab = "formulario" | "diy"

import type { RagToast } from "@/App"

export function MensajesPage({ onRagToast, onNavigateToRag }: { onRagToast?: (t: RagToast) => void; onNavigateToRag?: (id: number) => void }) {
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("formulario")
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // Presupuesto
  const [lineas, setLineas] = useState<LineaPresupuesto[]>([{ id: 1, descripcion: "", precio: "" }])
  const [notasPresupuesto, setNotasPresupuesto] = useState("")
  const [nextId, setNextId] = useState(2)
  const [editandoPresupuesto, setEditandoPresupuesto] = useState(false)
  const [aceptadas, setAceptadas] = useState<Set<number>>(new Set())
  const [rechazadas, setRechazadas] = useState<Set<number>>(new Set())
  const [motivoRechazo, setMotivoRechazo] = useState<Record<number, string>>({})
  const [mensajePresupuesto, setMensajePresupuesto] = useState("")
  const [search, setSearch]   = useState("")
  const [sending, setSending] = useState(false)
  const [sendOk, setSendOk]   = useState<string | null>(null)
  const [sendErr, setSendErr] = useState<string | null>(null)

  // Chat por presupuesto
  interface ChatMsg { sender: "cliente" | "tecnico"; sender_nombre?: string; mensaje: string; created_at: string; archivo?: string }
  const [chatTokens, setChatTokens]   = useState<Record<number, string>>({})
  const [chatMsgs, setChatMsgs]       = useState<Record<number, ChatMsg[]>>({})
  const [chatCerrado, setChatCerrado] = useState<Set<number>>(new Set())
  const [chatEtiquetas, setChatEtiquetas] = useState<Record<number, string[]>>({})
  const [tagEditing, setTagEditing]   = useState(false)
  const [newTag, setNewTag]           = useState("")
  const tagInputRef = useRef<HTMLInputElement>(null)
  const [chatInput, setChatInput]     = useState("")
  const [chatFile, setChatFile]       = useState<File | null>(null)
  const [aiLoading, setAiLoading]     = useState(false)
  const [aiError, setAiError]         = useState<string | null>(null)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [aiReferencias, setAiReferencias] = useState<{ ref: string; id: number; titulo: string; categoria: string }[]>([])
  const [aiPresupuestoLoading, setAiPresupuestoLoading] = useState(false)
  const chatBoxRef  = useRef<HTMLDivElement>(null)
  const chatFileRef = useRef<HTMLInputElement>(null)

  // Resizable columns
  const [sidebarWidth, setSidebarWidth] = useState(240)
  const [chatWidth, setChatWidth]       = useState(360)
  const dragRef = useRef<{ col: "sidebar" | "chat"; startX: number; startW: number } | null>(null)

  const startDrag = (col: "sidebar" | "chat", e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = col === "sidebar" ? sidebarWidth : chatWidth
    dragRef.current = { col, startX, startW }
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX
      if (col === "sidebar")
        setSidebarWidth(Math.max(160, Math.min(400, startW + delta)))
      else
        setChatWidth(Math.max(260, Math.min(600, startW - delta)))
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  useEffect(() => {
    authFetch(api("contactos"))
      .then(res => {
        if (!res.ok) throw new Error("Error en la conexión con el servidor")
        return res.json()
      })
      .then((data: Contacto[]) => {
        setContactos(data)
        const first = data.find(c => c.tipo === "formulario")
        if (first) setSelectedId(first.id)
        const tokens: Record<number, string> = {}
        const acc = new Set<number>()
        const cerr = new Set<number>()
        const etqs: Record<number, string[]> = {}
        data.forEach(c => {
          if (c.chat_token) { tokens[c.id] = c.chat_token; acc.add(c.id) }
          if (c.chat_cerrado) cerr.add(c.id)
          etqs[c.id] = Array.isArray(c.etiquetas) ? c.etiquetas : []
        })
        setChatTokens(tokens)
        setAceptadas(acc)
        setChatCerrado(cerr)
        setChatEtiquetas(etqs)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError("Incapaz de conectar con la base de datos (backend o MySQL offline).")
        setLoading(false)
      })
  }, [])

  const lista = contactos.filter(c => {
    if (c.tipo !== activeTab) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.nombre?.toLowerCase().includes(q) ||
      c.apellido?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.mensaje?.toLowerCase().includes(q) ||
      c.problema?.toLowerCase().includes(q) ||
      c.producto?.toLowerCase().includes(q)
    )
  })
  const selected = contactos.find(c => c.id === selectedId)

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    setSearch("")
    const first = contactos.find(c => c.tipo === tab)
    setSelectedId(first?.id ?? null)
  }

  const handleSelectMessage = (id: number) => {
    setSelectedId(id)
    setEditandoPresupuesto(false)
    const msg = contactos.find(c => c.id === id)
    if (msg && !msg.leido) {
      authFetch(api("contactos/leido"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      })
      setContactos(prev => prev.map(c => c.id === id ? { ...c, leido: true } : c))
    }
  }

  const notify = (ok: string | null, err: string | null) => {
    setSendOk(ok); setSendErr(err)
    setTimeout(() => { setSendOk(null); setSendErr(null) }, 4000)
  }

  const handleReply = async (email: string, nombre: string, apellido: string, producto: string, problema: string, respuesta: string) => {
    setSending(true)
    try {
      const res = await authFetch(api("presupuesto/reply"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, nombre, apellido, producto, problema, respuesta })
      })
      const data = await res.json()
      data.success ? notify("Respuesta enviada correctamente.", null) : notify(null, data.error ?? "Error al enviar.")
    } catch { notify(null, "No se pudo conectar con el servidor.") }
    setSending(false)
  }

  const addLinea = () => {
    setLineas(prev => [...prev, { id: nextId, descripcion: "", precio: "" }])
    setNextId(n => n + 1)
  }

  const removeLinea = (id: number) => {
    setLineas(prev => prev.filter(l => l.id !== id))
  }

  const updateLinea = (id: number, field: "descripcion" | "precio", value: string) => {
    setLineas(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l))
  }

  const totalPresupuesto = lineas.reduce((sum, l) => {
    const n = parseFloat(l.precio.replace(",", "."))
    return sum + (isNaN(n) ? 0 : n)
  }, 0)

  const cargarPresupuestoExistente = async (token: string) => {
    try {
      const res = await authFetch(`${api("presupuesto")}?token=${encodeURIComponent(token)}`)
      const data = await res.json()
      if (data.lineas) {
        setLineas(data.lineas.map((l: { descripcion: string; precio: number | string }, i: number) => ({ id: i + 1, descripcion: l.descripcion, precio: String(l.precio) })))
        setNextId(data.lineas.length + 1)
        setMensajePresupuesto(data.mensaje ?? "")
        setNotasPresupuesto(data.notas ?? "")
      }
    } catch { /* silencioso */ }
  }

  const handleActualizarPresupuesto = async (token: string) => {
    setSending(true)
    try {
      const res = await authFetch(api("presupuesto/actualizar"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, lineas, total: totalPresupuesto, mensaje: mensajePresupuesto, notas: notasPresupuesto })
      })
      const data = await res.json()
      if (data.success) { notify("Presupuesto actualizado y reenviado.", null); setEditandoPresupuesto(false) }
      else notify(null, data.error ?? "Error al actualizar.")
    } catch { notify(null, "No se pudo conectar con el servidor.") }
    setSending(false)
  }

  const handleEnviarPresupuesto = async (email: string, nombre: string) => {
    setSending(true)
    try {
      const res = await authFetch(api("presupuesto/enviar"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, nombre, contacto_id: selected?.id, lineas, total: totalPresupuesto, mensaje: mensajePresupuesto, notas: notasPresupuesto })
      })
      const data = await res.json()
      if (data.success) {
        notify("Presupuesto enviado correctamente.", null)
        if (data.token && selectedId) setChatTokens(prev => ({ ...prev, [selectedId]: data.token }))
      } else {
        notify(null, data.error ?? "Error al enviar.")
      }
    } catch { notify(null, "No se pudo conectar con el servidor.") }
    setSending(false)
  }

  const loadChat = (token: string, contactoId: number) => {
    authFetch(`${api("chat")}?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        const msgs: ChatMsg[] = data.mensajes ?? data
        const cerrado: boolean = data.cerrado ?? false
        setChatMsgs(prev => ({ ...prev, [contactoId]: msgs }))
        if (cerrado) setChatCerrado(prev => { const n = new Set(prev); n.add(contactoId); return n })
        setTimeout(() => { if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight }, 50)
      })
      .catch(() => {})
  }

  useEffect(() => {
    if (!selectedId) return
    const token = chatTokens[selectedId]
    if (!token) return
    loadChat(token, selectedId)
    const interval = setInterval(() => loadChat(token, selectedId), 4000)
    return () => clearInterval(interval)
  }, [selectedId, chatTokens])

  const saveEtiquetas = async (contactoId: number, etiquetas: string[]) => {
    const token = chatTokens[contactoId]
    if (!token) return
    const res = await authFetch(api("chat/etiquetas"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, etiquetas })
    })
    const data = await res.json()
    if (data.success) setChatEtiquetas(prev => ({ ...prev, [contactoId]: data.etiquetas }))
  }

  const addEtiqueta = (tag: string) => {
    if (!selectedId || !tag.trim()) return
    const current = chatEtiquetas[selectedId] ?? []
    if (current.includes(tag.trim())) return
    saveEtiquetas(selectedId, [...current, tag.trim()])
  }

  const removeEtiqueta = (tag: string) => {
    if (!selectedId) return
    const current = chatEtiquetas[selectedId] ?? []
    saveEtiquetas(selectedId, current.filter(e => e !== tag))
  }

  const handleCerrarChat = async () => {
    if (!selectedId || !confirm("¿Cerrar este chat? El cliente ya no podrá ver ni escribir mensajes.\n\nLa IA analizará la conversación y guardará información relevante en Contexto IA.")) return
    const token = chatTokens[selectedId]
    if (!token) return
    await authFetch(api("chat/cerrar"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    })
    const closedId = selectedId
    setChatCerrado(prev => { const n = new Set(prev); n.add(closedId); return n })
    onRagToast?.({ state: "loading" })
    try {
      const res = await authFetch(api("chat/extraer_contexto"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, rag_modo: localStorage.getItem("rag_modo") ?? "completo" })
      })
      const data = await res.json()
      let saved = 0
      if (Array.isArray(data.entradas) && data.entradas.length > 0) {
        for (const entrada of data.entradas) {
          try {
            const r = await authFetch(api("rag/crear"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ titulo: entrada.titulo, contenido: entrada.contenido, categoria: entrada.categoria ?? "General" })
            })
            if (r.ok) saved++
          } catch { /* best-effort */ }
        }
      }
      onRagToast?.({ state: "done", count: saved })
    } catch {
      onRagToast?.({ state: "done", count: 0 })
    }
  }

  const handleSendChat = async () => {
    if (!selectedId || (!chatInput.trim() && !chatFile)) return
    const token = chatTokens[selectedId]
    if (!token) return
    const msg = chatInput.trim()
    setChatInput("")
    if (chatFile) {
      const fd = new FormData()
      fd.append("token", token)
      fd.append("sender", "tecnico")
      fd.append("mensaje", msg)
      fd.append("archivo", chatFile)
      setChatFile(null)
      if (chatFileRef.current) chatFileRef.current.value = ""
      await authFetch(api("chat/upload"), { method: "POST", body: fd as unknown as BodyInit })
    } else {
      await authFetch(api("chat/enviar"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, sender: "tecnico", mensaje: msg })
      })
    }
    loadChat(token, selectedId)
  }

  const handleAISuggest = async () => {
    if (!selectedId) return
    const token = chatTokens[selectedId]
    if (!token) return
    setAiSuggestions([])
    setAiReferencias([])
    setAiError(null)
    setAiLoading(true)
    try {
      const res = await authFetch(api("chat/sugerir"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, borrador: chatInput.trim(), rag_modo: localStorage.getItem("rag_modo") ?? "completo" })
      })
      const data = await res.json()
      if (data.sugerencias?.length) {
        setAiSuggestions(data.sugerencias)
        setAiReferencias(data.referencias ?? [])
      } else {
        setAiError(data.error ?? "Error al generar sugerencias.")
      }
    } catch { setAiError("No se pudo contactar con la IA.") }
    setAiLoading(false)
  }

  const handleAIPresupuesto = async (token?: string) => {
    if (!selectedId) return
    setAiPresupuestoLoading(true)
    try {
      const body = token ? { token } : { contacto_id: selectedId }
      const res = await authFetch(api("presupuesto/sugerir"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.success && data.lineas?.length) {
        setLineas(data.lineas.map((l: { descripcion: string; precio: number }, i: number) => ({ id: i + 1, descripcion: l.descripcion, precio: String(l.precio) })))
        setNextId(data.lineas.length + 1)
        if (data.mensaje) setMensajePresupuesto(data.mensaje)
        if (data.notas) setNotasPresupuesto(data.notas)
      } else {
        notify(null, data.error ?? "Error al generar presupuesto con IA.")
      }
    } catch { notify(null, "No se pudo contactar con la IA.") }
    setAiPresupuestoLoading(false)
  }

  const [chatPanelOpen, setChatPanelOpen] = useState(false)
  const [averiasPanelOpen, setAveriasPanelOpen] = useState(false)
  const [averias, setAverias] = useState<{ id: number; es_averia: number; marca: string | null; tipo_averia: string | null; modelo: string | null; funcion: string | null; resumen: string | null; descripcion: string | null; solucion: string | null; precio_reparacion: number | null }[]>([])
  const [averiaSelected, setAveriaSelected] = useState<number | null>(null)
  const [averiasLoading, setAveriasLoading] = useState(false)
  const [averiasExtracting, setAveriasExtracting] = useState(false)

  const loadAverias = async () => {
    setAveriasLoading(true)
    try {
      const res = await authFetch(api("averias"))
      const data = await res.json()
      setAverias(data.averias ?? [])
    } catch { /* noop */ }
    setAveriasLoading(false)
  }

  const extractAverias = async () => {
    setAveriasExtracting(true)
    try {
      const res = await authFetch(api("averias/extraer"), { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        notify(null, data.error ?? "Error al extraer averías.")
      } else {
        notify(data.procesados > 0 ? `${data.procesados} avería${data.procesados !== 1 ? "s" : ""} extraída${data.procesados !== 1 ? "s" : ""} correctamente.` : "No hay chats cerrados nuevos que procesar.", null)
        await loadAverias()
      }
    } catch { notify(null, "No se pudo contactar con el servidor.") }
    setAveriasExtracting(false)
  }

  useEffect(() => {
    if (averiasPanelOpen) loadAverias()
    else setAveriaSelected(null)
  }, [averiasPanelOpen])

  // Chat column available when diy + accepted + token exists
  const chatAvailable = activeTab === "diy" && !!selected && aceptadas.has(selected.id) && !!chatTokens[selected.id]
  const showChatColumn = chatAvailable && chatPanelOpen

  return (
    <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500 avant-premium-layout rounded-xl px-4 pt-3 pb-2">

      {/* Toast flotante */}
      {(sendOk || sendErr) && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50 rounded-xl px-5 py-3 text-sm font-medium shadow-xl border animate-in slide-in-from-bottom-2 duration-300",
          sendOk ? "bg-green-500/15 text-green-400 border-green-500/30 backdrop-blur" : "bg-red-500/15 text-red-400 border-red-500/30 backdrop-blur"
        )}>
          {sendOk ?? sendErr}
        </div>
      )}

      {/* Header + Tabs en una sola línea */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold tracking-tight neon-title leading-tight">Mensajes de Clientes</h2>
          <p className="text-muted-foreground text-xs">Revisión técnica de los tickets y mensajes recibidos.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleTabChange("formulario")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all",
              activeTab === "formulario"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
            )}
          >
            <Mail className="h-4 w-4" />
            Formulario
            <span className="ml-0.5 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
              {contactos.filter(c => c.tipo === "formulario").length}
            </span>
          </button>
          <button
            onClick={() => handleTabChange("diy")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all",
              activeTab === "diy"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
            )}
          >
            <Settings className="h-4 w-4" />
            AvantFix
            <span className="ml-0.5 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
              {contactos.filter(c => c.tipo === "diy").length}
            </span>
          </button>
        </div>
      </div>

      {/* Layout principal — flex-1 para ocupar el resto de altura */}
      <div className="flex rounded-xl border bg-card shadow-sm glass-panel overflow-hidden" style={{ height: "calc(100vh - 120px)" }}>

        {/* ── COLUMNA 1: Lista de contactos ── */}
        <div className="shrink-0 flex flex-col border-r bg-background/50 sidebar-glass" style={{ width: sidebarWidth }}>
          <div className="p-4 border-b shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={activeTab === "formulario" ? "Buscar nombre o problema..." : "Buscar por email..."}
                className="h-10 w-full rounded-md border border-input bg-transparent pl-9 pr-4 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-sm text-foreground animate-pulse font-medium">Conectando con base de datos...</div>
            ) : error ? (
              <div className="p-8 text-center text-sm text-red-500 font-medium">{error}</div>
            ) : lista.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No hay mensajes en esta sección.</div>
            ) : lista.map(msg => (
              <button
                key={msg.id}
                onClick={() => handleSelectMessage(msg.id)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b transition-colors hover:bg-muted/50 message-item",
                  selectedId === msg.id && "active"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {!msg.leido && <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                      <span className={cn("text-sm truncate", !msg.leido ? "font-bold text-foreground" : "font-medium text-foreground/80")}>
                        {activeTab === "formulario"
                          ? `${msg.nombre ?? ""} ${msg.apellido ?? ""}`.trim() || msg.email
                          : msg.email}
                      </span>
                    </div>
                    <p className={cn("text-xs truncate", !msg.leido ? "text-primary font-medium" : "text-muted-foreground")}>
                      {activeTab === "formulario" ? (msg.problema ?? msg.mensaje) : (msg.problema ?? "Sin problema especificado")}
                    </p>
                    {activeTab === "formulario" && msg.producto && (
                      <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">{msg.producto}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(msg.fecha_creacion).toLocaleDateString()}
                    </span>
                    {msg.dificultad && (
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-medium", DIFICULTAD_COLOR[msg.dificultad])}>
                        {DIFICULTAD_LABEL[msg.dificultad]}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Drag handle — sidebar */}
        <div className="w-1 shrink-0 cursor-col-resize hover:bg-primary/40 transition-colors relative" onMouseDown={e => startDrag("sidebar", e)}>
          <div className="absolute inset-y-0 -left-1 -right-1" />
        </div>

        {/* ── COLUMNA 2: Detalle del mensaje ── */}
        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden min-w-0 bg-card">
          {selected ? (
            <>
              {/* Header del contacto */}
              <div className="flex items-center gap-3 flex-wrap px-5 py-4 border-b shrink-0 detail-header">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                  {selected.tipo === "diy" ? <Settings className="h-5 w-5" /> : <User className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate">
                    {selected.tipo === "formulario"
                      ? `${selected.nombre ?? ""} ${selected.apellido ?? ""}`.trim() || selected.email
                      : selected.email}
                  </h3>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                    {selected.tipo === "formulario" && selected.telefono && (
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selected.telefono}</span>
                    )}
                    {selected.tipo === "formulario" && selected.producto && (
                      <span className="flex items-center gap-1"><Package className="h-3 w-3" />{selected.producto}</span>
                    )}
                    {selected.tipo === "diy" && selected.dificultad && (
                      <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full border font-medium text-[10px]", DIFICULTAD_COLOR[selected.dificultad])}>
                        {DIFICULTAD_LABEL[selected.dificultad]}
                      </span>
                    )}
                    <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{selected.origen}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(selected.fecha_creacion).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {selected.tipo === "diy" ? (
                    <>
                      <button
                        onClick={() => setAceptadas(prev => {
                          const next = new Set(prev)
                          next.has(selected.id) ? next.delete(selected.id) : next.add(selected.id)
                          return next
                        })}
                        disabled={rechazadas.has(selected.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all disabled:opacity-30 disabled:pointer-events-none",
                          aceptadas.has(selected.id)
                            ? "bg-green-500/15 text-green-400 border-green-500/40 hover:bg-green-500/25"
                            : "bg-muted text-muted-foreground border-border hover:text-foreground"
                        )}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {aceptadas.has(selected.id) ? "Aceptada" : "Aceptar"}
                      </button>
                      <button
                        onClick={() => setRechazadas(prev => {
                          const next = new Set(prev)
                          next.has(selected.id) ? next.delete(selected.id) : next.add(selected.id)
                          return next
                        })}
                        disabled={aceptadas.has(selected.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all disabled:opacity-30 disabled:pointer-events-none",
                          rechazadas.has(selected.id)
                            ? "bg-red-500/15 text-red-400 border-red-500/40 hover:bg-red-500/25"
                            : "bg-muted text-muted-foreground border-border hover:text-foreground"
                        )}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        {rechazadas.has(selected.id) ? "Rechazada" : "Rechazar"}
                      </button>
                    </>
                  ) : (
                    <button className="p-2 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-foreground" title="Marcar como completado">
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    className="p-2 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-destructive"
                    title="Eliminar"
                    onClick={async () => {
                      if (!selected || !confirm("¿Eliminar este mensaje? Esta acción no se puede deshacer.")) return
                      await authFetch(api("contactos/eliminar"), {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: selected.id })
                      })
                      setContactos(prev => prev.filter(c => c.id !== selected.id))
                      setSelectedId(null)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {chatAvailable && (
                    <button
                      onClick={() => setChatPanelOpen(o => !o)}
                      title={chatPanelOpen ? "Ocultar chat" : "Ver chat"}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all",
                        chatPanelOpen
                          ? "bg-primary/15 text-primary border-primary/40 hover:bg-primary/25"
                          : "bg-muted text-muted-foreground border-border hover:text-foreground hover:border-border/80"
                      )}
                    >
                      {chatPanelOpen
                        ? <><PanelRightClose className="h-3.5 w-3.5" /> Chat</>
                        : <><PanelRightOpen className="h-3.5 w-3.5" /> Chat</>
                      }
                    </button>
                  )}
                </div>
              </div>

              {/* Contenido del mensaje */}
              <div className="flex-1 p-5 flex flex-col gap-4">
                {selected.problema && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Asunto / Problema</p>
                    <h2 className="text-lg font-bold text-primary leading-snug">{selected.problema}</h2>
                  </div>
                )}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Mensaje del cliente</p>
                  <p className="whitespace-pre-wrap leading-relaxed text-foreground/90 text-sm bg-background/60 p-4 rounded-lg border border-border/50 message-content-box">
                    {selected.mensaje}
                  </p>
                </div>

                {/* PANEL NEUTRO — AvantFix sin acción */}
                {selected.tipo === "diy" && !aceptadas.has(selected.id) && !rechazadas.has(selected.id) && (
                  <div className="rounded-xl border border-border/50 bg-muted/10 p-6 flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <h4 className="text-sm font-semibold text-foreground">¿Cómo deseas gestionar esta consulta?</h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Acepta la consulta para preparar y enviar un presupuesto al cliente, o recházala para notificarle que no podéis atenderla.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setAceptadas(prev => { const next = new Set(prev); next.add(selected.id); return next })}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-all"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Aceptar y presupuestar
                      </button>
                      <button
                        onClick={() => setRechazadas(prev => { const next = new Set(prev); next.add(selected.id); return next })}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all"
                      >
                        <XCircle className="h-4 w-4" />
                        Rechazar consulta
                      </button>
                    </div>
                  </div>
                )}

                {/* SECCIÓN RECHAZO */}
                {selected.tipo === "diy" && rechazadas.has(selected.id) && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/5 overflow-hidden">
                    <div className="flex items-center gap-2 px-6 py-4 border-b border-red-500/20 bg-red-500/10">
                      <XCircle className="h-4 w-4 text-red-400" />
                      <h4 className="text-sm font-semibold text-red-400">Email de rechazo</h4>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-xs text-muted-foreground">
                        Redacta el motivo del rechazo. Se incluirá en el cuerpo del correo al cliente.
                      </p>
                      <textarea
                        value={motivoRechazo[selected.id] ?? `Estimado/a cliente,\n\nTras revisar su solicitud, lamentamos informarle que no podemos atenderla en este momento.\n\nMotivo: \n\nSi tiene alguna pregunta, no dude en contactarnos.\n\nUn saludo,\nEquipo AvantElite`}
                        onChange={e => setMotivoRechazo(prev => ({ ...prev, [selected.id]: e.target.value }))}
                        rows={8}
                        className="w-full rounded-md border border-red-500/20 bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500/50"
                      />
                      <button
                        disabled={sending}
                        onClick={async () => {
                          const defaultMotivo = `Estimado/a cliente,\n\nTras revisar su solicitud, lamentamos informarle que no podemos atenderla en este momento.\n\nMotivo: \n\nSi tiene alguna pregunta, no dude en contactarnos.\n\nUn saludo,\nEquipo AvantElite`
                          const motivo = motivoRechazo[selected.id] ?? defaultMotivo
                          if (!motivo.trim()) return
                          setSending(true)
                          try {
                            const res = await authFetch(api("presupuesto/rechazar"), {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ email: selected.email, nombre: selected.nombre ?? selected.email, motivo })
                            })
                            const data = await res.json()
                            data.success ? notify("Rechazo enviado correctamente.", null) : notify(null, data.error ?? "Error al enviar.")
                          } catch { notify(null, "No se pudo conectar con el servidor.") }
                          setSending(false)
                        }}
                        className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-all disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                        {sending ? "Enviando…" : "Enviar rechazo"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Presupuesto ya enviado — banner editar */}
                {selected.tipo === "diy" && aceptadas.has(selected.id) && chatTokens[selected.id] && !editandoPresupuesto && (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-3 text-sm text-green-400">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      Presupuesto ya enviado a este cliente.
                    </div>
                    <button
                      onClick={() => { setEditandoPresupuesto(true); cargarPresupuestoExistente(chatTokens[selected.id]) }}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-green-500/40 hover:bg-green-500/20 transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5" /> Editar
                    </button>
                  </div>
                )}

                {/* Formulario edición presupuesto existente */}
                {selected.tipo === "diy" && aceptadas.has(selected.id) && chatTokens[selected.id] && editandoPresupuesto && (
                  <div className="rounded-xl border border-primary/30 bg-background/40 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-semibold text-foreground">Editar Presupuesto</h4>
                        <button
                          onClick={() => handleAIPresupuesto(chatTokens[selected.id])}
                          disabled={aiPresupuestoLoading}
                          title="Rehacer con IA usando el chat"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-violet-500/40 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 hover:border-violet-400/60 transition-all disabled:opacity-50 disabled:pointer-events-none"
                        >
                          {aiPresupuestoLoading
                            ? <><Sparkles className="h-3.5 w-3.5 animate-pulse" /> Generando…</>
                            : <><Sparkles className="h-3.5 w-3.5" /> IA</>
                          }
                        </button>
                      </div>
                      <button onClick={() => setEditandoPresupuesto(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-[1fr_90px_32px] gap-2 text-xs uppercase tracking-wider text-muted-foreground px-1">
                        <span>Descripción del trabajo / pieza</span>
                        <span className="text-right">Precio (€)</span>
                        <span />
                      </div>
                      <div className="space-y-2">
                        {lineas.map((linea) => (
                          <div key={linea.id} className="grid grid-cols-[1fr_90px_32px] gap-2 items-center">
                            <input type="text" value={linea.descripcion} onChange={e => updateLinea(linea.id, "descripcion", e.target.value)} placeholder="Ej: Cambio de pantalla..." className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                            <input type="number" value={linea.precio} onChange={e => updateLinea(linea.id, "precio", e.target.value)} placeholder="0.00" min="0" step="0.01" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-right focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                            <button onClick={() => removeLinea(linea.id)} disabled={lineas.length === 1} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"><X className="h-4 w-4" /></button>
                          </div>
                        ))}
                      </div>
                      <button onClick={addLinea} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"><Plus className="h-3.5 w-3.5" />Añadir línea</button>
                      <div className="flex justify-end pt-2 border-t">
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">Total estimado</span>
                          <p className="text-2xl font-bold text-primary mt-0.5">{totalPresupuesto.toFixed(2)} €</p>
                          <span className="text-[10px] text-muted-foreground">IVA incluido</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Mensaje al cliente</label>
                        <textarea value={mensajePresupuesto} onChange={e => setMensajePresupuesto(e.target.value)} placeholder="Ej: Hemos actualizado el presupuesto..." rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Observaciones (opcional)</label>
                        <textarea value={notasPresupuesto} onChange={e => setNotasPresupuesto(e.target.value)} placeholder="Ej: Plazo estimado 3-5 días hábiles..." rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                      </div>
                      <button
                        onClick={() => handleActualizarPresupuesto(chatTokens[selected.id])}
                        disabled={lineas.every(l => !l.descripcion.trim()) || sending}
                        className="flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-white shadow-lg btn-premium disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <Send className="h-4 w-4" />
                        {sending ? "Actualizando…" : "Actualizar y reenviar"}
                      </button>
                    </div>
                  </div>
                )}

                {/* SECCIÓN PRESUPUESTO — nuevo */}
                {selected.tipo === "diy" && aceptadas.has(selected.id) && !chatTokens[selected.id] && (
                  <div className="rounded-xl border border-border/60 bg-background/40 overflow-hidden">
                    <div className="flex items-center gap-2 px-6 py-4 border-b bg-muted/20">
                      <FileText className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-semibold text-foreground">Enviar Presupuesto</h4>
                      <button
                        onClick={() => handleAIPresupuesto()}
                        disabled={aiPresupuestoLoading}
                        title="Rellenar con IA"
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-violet-500/40 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 hover:border-violet-400/60 transition-all disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {aiPresupuestoLoading
                          ? <><Sparkles className="h-3.5 w-3.5 animate-pulse" /> Generando…</>
                          : <><Sparkles className="h-3.5 w-3.5" /> Rellenar con IA</>
                        }
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-[1fr_90px_32px] gap-2 text-xs uppercase tracking-wider text-muted-foreground px-1">
                        <span>Descripción del trabajo / pieza</span>
                        <span className="text-right">Precio (€)</span>
                        <span />
                      </div>
                      <div className="space-y-2">
                        {lineas.map((linea) => (
                          <div key={linea.id} className="grid grid-cols-[1fr_90px_32px] gap-2 items-center">
                            <input
                              type="text"
                              value={linea.descripcion}
                              onChange={e => updateLinea(linea.id, "descripcion", e.target.value)}
                              placeholder="Ej: Cambio de pantalla, mano de obra..."
                              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                            <input
                              type="number"
                              value={linea.precio}
                              onChange={e => updateLinea(linea.id, "precio", e.target.value)}
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-right focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                            <button
                              onClick={() => removeLinea(linea.id)}
                              disabled={lineas.length === 1}
                              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button onClick={addLinea} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
                        <Plus className="h-3.5 w-3.5" />Añadir línea
                      </button>
                      <div className="flex justify-end pt-2 border-t">
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">Total estimado</span>
                          <p className="text-2xl font-bold text-primary mt-0.5">{totalPresupuesto.toFixed(2)} €</p>
                          <span className="text-[10px] text-muted-foreground">IVA incluido</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Mensaje al cliente</label>
                        <textarea
                          value={mensajePresupuesto}
                          onChange={e => setMensajePresupuesto(e.target.value)}
                          placeholder="Ej: Tras revisar su solicitud, hemos preparado el siguiente presupuesto..."
                          rows={3}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Observaciones (opcional)</label>
                        <textarea
                          value={notasPresupuesto}
                          onChange={e => setNotasPresupuesto(e.target.value)}
                          placeholder="Ej: Plazo estimado de entrega 3-5 días hábiles..."
                          rows={3}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                      <button
                        onClick={() => handleEnviarPresupuesto(
                          selected.email,
                          selected.tipo === "formulario"
                            ? `${selected.nombre ?? ""} ${selected.apellido ?? ""}`.trim()
                            : selected.email
                        )}
                        disabled={lineas.every(l => !l.descripcion.trim())}
                        className="flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-white shadow-lg btn-premium disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <Send className="h-4 w-4" />
                        {sending ? "Enviando…" : "Enviar presupuesto"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Reply — solo formulario */}
                {selected.tipo === "formulario" && (
                  <div className="space-y-3">
                    <textarea
                      id="reply-text"
                      rows={3}
                      placeholder="Escribe tu respuesta al cliente..."
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <button
                      disabled={sending}
                      onClick={() => {
                        const txt = (document.getElementById("reply-text") as HTMLTextAreaElement).value.trim()
                        if (!txt) return
                        handleReply(selected.email, selected.nombre ?? "", selected.apellido ?? "", selected.producto ?? "", selected.problema ?? "", txt)
                      }}
                      className="flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-white shadow-lg btn-premium disabled:opacity-50"
                    >
                      <Reply className="h-4 w-4" />
                      {sending ? "Enviando…" : "Enviar respuesta"}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <Mail className="h-16 w-16 mb-4 opacity-20" />
              <p>Selecciona un mensaje para leerlo</p>
            </div>
          )}
        </div>

        {/* ── COLUMNA 3: Chat (solo AvantFix aceptado con presupuesto) ── */}
        {showChatColumn && selected && (
          <>
          {/* Drag handle — chat */}
          <div className="w-1 shrink-0 cursor-col-resize hover:bg-primary/40 transition-colors relative" onMouseDown={e => startDrag("chat", e)}>
            <div className="absolute inset-y-0 -left-1 -right-1" />
          </div>
          <div className="shrink-0 flex flex-col border-l bg-background/20" style={{ width: chatWidth }}>
            {/* Header del chat */}
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/20 shrink-0">
              <MessageCircle className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Chat</h4>
              {chatCerrado.has(selected.id) ? (
                <div className="ml-auto flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    Cerrado
                  </span>
                  <button
                    onClick={async () => {
                      const token = chatTokens[selected.id]
                      if (!token) return
                      await authFetch(api("chat/reabrir"), {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ token })
                      })
                      setChatCerrado(prev => { const n = new Set(prev); n.delete(selected.id); return n })
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                  >
                    Reabrir
                  </button>
                </div>
              ) : (
                <>
                  <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    En línea
                  </span>
                  <button
                    onClick={handleCerrarChat}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                    title="Cerrar chat"
                  >
                    <Lock className="h-3 w-3" />
                    Cerrar
                  </button>
                </>
              )}
            </div>

            {/* Etiquetas */}
            <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b bg-background/10 shrink-0">
              <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {(chatEtiquetas[selected.id] ?? []).map(tag => (
                <span key={tag} className={cn("flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium", etiquetaColor(tag))}>
                  {tag}
                  <button onClick={() => removeEtiqueta(tag)} className="opacity-60 hover:opacity-100 transition-opacity">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
              {tagEditing ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") { addEtiqueta(newTag); setNewTag(""); setTagEditing(false) }
                      if (e.key === "Escape") { setNewTag(""); setTagEditing(false) }
                    }}
                    placeholder="Nueva etiqueta…"
                    className="h-6 text-xs rounded border border-input bg-background px-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-28"
                    autoFocus
                  />
                  {ETIQUETAS_PREDEFINIDAS
                    .filter(e => !(chatEtiquetas[selected.id] ?? []).includes(e.label))
                    .slice(0, 3)
                    .map(e => (
                      <button
                        key={e.label}
                        onClick={() => { addEtiqueta(e.label); setTagEditing(false) }}
                        className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-medium hover:opacity-80 transition-opacity", e.color)}
                      >
                        {e.label}
                      </button>
                    ))}
                  <button onClick={() => { setNewTag(""); setTagEditing(false) }} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setTagEditing(true); setTimeout(() => tagInputRef.current?.focus(), 50) }}
                  className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  <Plus className="h-2.5 w-2.5" /> Etiqueta
                </button>
              )}
            </div>

            {/* Mensajes */}
            <div ref={chatBoxRef} className="flex-1 flex flex-col gap-3 p-4 overflow-y-auto min-h-0">
              {(chatMsgs[selected.id] ?? []).length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">Aún no hay mensajes.</p>
              ) : (chatMsgs[selected.id] ?? []).map((m, i) => (
                <div key={i} className={cn("flex flex-col max-w-[85%]", m.sender === "tecnico" ? "self-end items-end" : "self-start items-start")}>
                  <div className={cn("rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    m.sender === "tecnico"
                      ? "bg-primary/20 border border-primary/30 rounded-br-sm"
                      : "bg-muted/40 border border-border/50 rounded-bl-sm"
                  )}>
                    {m.mensaje && <p>{m.mensaje}</p>}
                    {m.archivo && (/\.(jpg|jpeg|png|webp|gif)$/i.test(m.archivo)
                      ? <img src={m.archivo} alt="adjunto" className="max-w-[160px] max-h-[120px] rounded-lg mt-1 cursor-pointer" onClick={() => window.open(m.archivo)} />
                      : <a href={m.archivo} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary text-xs mt-1 hover:underline">📄 {m.archivo.split("/").pop()}</a>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1">
                    {m.sender === "tecnico" ? "Tú" : (m.sender_nombre || selected.nombre || selected.email)} · {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>

            {/* Adjunto preview */}
            {chatFile && (
              <div className="flex items-center gap-2 px-4 py-2 border-t border-primary/20 bg-primary/5 text-xs text-primary shrink-0">
                <span className="flex-1 truncate">📁 {chatFile.name}</span>
                <button onClick={() => { setChatFile(null); if (chatFileRef.current) chatFileRef.current.value = "" }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            )}

            {/* Error IA inline */}
            {aiError && (
              <div className="mx-3 mb-2 mt-1 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400 shrink-0">
                <span className="shrink-0 mt-0.5">⚠</span>
                <span className="flex-1">{aiError}</span>
                <button onClick={() => setAiError(null)} className="shrink-0 text-red-400/60 hover:text-red-400">✕</button>
              </div>
            )}

            {/* Sugerencias IA */}
            {aiSuggestions.length > 0 && (
              <div className="px-4 pt-3 pb-2 border-t border-violet-500/20 bg-violet-500/5 flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-400 uppercase tracking-wider">
                    <Sparkles className="h-3 w-3" /> {chatInput.trim() ? "Versiones mejoradas" : "Sugerencias IA"}
                  </span>
                  <button onClick={() => { setAiSuggestions([]); setAiReferencias([]) }} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {aiSuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setChatInput(s); setAiSuggestions([]); setAiReferencias([]); setAiError(null) }}
                    className="text-left text-xs rounded-lg border border-violet-500/25 bg-background/60 px-3 py-2 text-foreground/90 hover:bg-violet-500/10 hover:border-violet-500/50 transition-all leading-relaxed"
                  >
                    <span className="text-[10px] font-bold text-violet-400 mr-1.5">#{i + 1}</span>
                    {s}
                  </button>
                ))}
                {aiReferencias.length > 0 && (
                  <div className="mt-1 pt-2 border-t border-violet-500/15">
                    <p className="text-[10px] uppercase tracking-wider text-violet-400/70 mb-1.5 flex items-center gap-1">
                      <BookOpen className="h-3 w-3" /> Fuentes utilizadas
                    </p>
                    <div className="flex flex-col gap-1">
                      {aiReferencias.map(r => (
                        <button
                          key={r.id}
                          onClick={() => onNavigateToRag?.(r.id)}
                          title="Ver documento en Contexto IA"
                          className="flex items-center gap-2 text-[11px] text-muted-foreground rounded-md bg-background/40 border border-violet-500/15 px-2.5 py-1.5 w-full text-left transition-colors hover:bg-violet-500/10 hover:border-violet-500/40 hover:text-foreground group"
                        >
                          <span className="text-[10px] font-bold text-violet-400/80 shrink-0">{r.ref}</span>
                          <span className="truncate font-medium text-foreground/70 group-hover:text-foreground">{r.titulo}</span>
                          <span className="shrink-0 ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400/80">{r.categoria}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Input del chat */}
            {chatCerrado.has(selected.id) ? (
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-t bg-background/10 shrink-0">
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  Chat cerrado. Solo lectura.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => { await extractAverias(); setAveriasPanelOpen(true) }}
                    disabled={averiasExtracting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium border border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Zap className={`h-3 w-3 ${averiasExtracting ? "animate-pulse" : ""}`} />
                    {averiasExtracting ? "Extrayendo…" : "Extraer avería"}
                  </button>
                  <button
                    onClick={() => setAveriasPanelOpen(p => !p)}
                    title="Ver averías resueltas"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium border transition-all ${averiasPanelOpen ? "border-orange-400/70 bg-orange-500/20 text-orange-300" : "border-orange-500/40 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 hover:border-orange-400/60"}`}
                  >
                    <Zap className="h-3 w-3" />
                    {averiasPanelOpen ? "Ocultar panel" : "Ver averías"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 p-3 border-t bg-background/20 shrink-0">
                <div className="flex gap-2">
                  <input ref={chatFileRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                    onChange={e => setChatFile(e.target.files?.[0] ?? null)} />
                  <button onClick={() => chatFileRef.current?.click()}
                    className="h-9 px-3 rounded-md border border-input bg-background/50 text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors shrink-0">
                    <FolderOpen className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setAveriasPanelOpen(p => !p)}
                    title="Resumen de averías resueltas"
                    className={`h-9 px-3 rounded-md border transition-all shrink-0 flex items-center gap-1.5 text-xs font-medium ${averiasPanelOpen ? "border-orange-400/70 bg-orange-500/20 text-orange-300" : "border-orange-500/40 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 hover:border-orange-400/60"}`}
                  >
                    <Zap className="h-3.5 w-3.5 shrink-0" />
                  </button>
                  <button
                    onClick={handleAISuggest}
                    disabled={aiLoading}
                    title={chatInput.trim() ? "Mejorar texto con IA" : "Sugerir respuesta con IA"}
                    className="h-9 px-3 rounded-md border border-violet-500/40 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 hover:border-violet-400/60 transition-all disabled:opacity-50 disabled:pointer-events-none shrink-0 flex items-center gap-1.5 text-xs font-medium"
                  >
                    <Sparkles className={`h-3.5 w-3.5 shrink-0 ${aiLoading ? "animate-pulse" : ""}`} />
                    {aiLoading
                      ? (chatInput.trim() ? "Mejorando…" : "Generando…")
                      : (chatInput.trim() ? "Mejorar" : "Sugerir")
                    }
                  </button>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSendChat()}
                    placeholder="Escribe un mensaje…"
                    className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-w-0"
                  />
                  <button
                    onClick={handleSendChat}
                    disabled={!chatInput.trim() && !chatFile}
                    className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium text-white btn-premium disabled:opacity-40 disabled:pointer-events-none shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

          </div>
          </>
        )}

      </div>

      {/* Panel averías resueltas */}
      {averiasPanelOpen && (
        <div className="shrink-0 rounded-xl border border-orange-500/20 bg-orange-500/5 shadow-sm glass-panel overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-orange-500/20">
            <Zap className="h-4 w-4 text-orange-400" />
            <span className="text-sm font-semibold text-orange-300 tracking-wide">Averías Resueltas</span>
            <span className="ml-1 text-[11px] text-orange-400/50">{averias.length > 0 ? `${averias.length} registros · ${averias.filter(a => a.es_averia).length} averías reales` : ""}</span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={extractAverias}
                disabled={averiasExtracting || averiasLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium border border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                <Zap className={`h-3 w-3 ${averiasExtracting ? "animate-pulse" : ""}`} />
                {averiasExtracting ? "Extrayendo…" : "Extraer nuevas"}
              </button>
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-auto max-h-48">
            <table className="w-full text-xs">
              <thead className="sticky top-0">
                <tr className="border-b border-orange-500/15 bg-[#1a0d00]">
                  <th className="px-4 py-2.5 text-left font-semibold text-orange-400/80 uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-orange-400/80 uppercase tracking-wider">Marca</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-orange-400/80 uppercase tracking-wider">Modelo</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-orange-400/80 uppercase tracking-wider">Avería</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-orange-400/80 uppercase tracking-wider">Función</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-orange-400/80 uppercase tracking-wider">Precio</th>
                </tr>
              </thead>
              <tbody>
                {averiasLoading ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-orange-400/40 animate-pulse">Cargando…</td></tr>
                ) : averias.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-orange-400/40">Sin registros aún — pulsa "Extraer nuevas" para analizar los chats cerrados</td></tr>
                ) : averias.map(a => (
                  <tr
                    key={a.id}
                    onClick={() => setAveriaSelected(av => av === a.id ? null : a.id)}
                    className={`border-b border-orange-500/10 cursor-pointer transition-colors ${averiaSelected === a.id ? "bg-orange-500/15" : "hover:bg-orange-500/10"}`}
                  >
                    <td className="px-4 py-2.5">
                      {a.es_averia
                        ? <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-500/15 text-orange-300 border border-orange-500/25">Avería</span>
                        : <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-500/15 text-zinc-400 border border-zinc-500/25">Consulta</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 text-foreground/80">{a.marca ?? "—"}</td>
                    <td className="px-4 py-2.5 text-foreground/80">{a.modelo ?? "—"}</td>
                    <td className="px-4 py-2.5 text-foreground/80">{a.tipo_averia ?? "—"}</td>
                    <td className="px-4 py-2.5 text-foreground/70 italic">{a.funcion ?? "—"}</td>
                    <td className="px-4 py-2.5 text-foreground/80">{a.precio_reparacion != null ? `${a.precio_reparacion} €` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detalle de avería seleccionada — solo visible cuando hay selección */}
          {averiaSelected != null && (() => {
            const a = averias.find(x => x.id === averiaSelected)
            if (!a) return null
            return (
              <div className="border-t border-orange-500/20 grid grid-cols-[1fr_2fr] divide-x divide-orange-500/15">
                <div className="p-4 flex flex-col gap-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-400/70 mb-1">Resumen</p>
                  <p className="text-xs text-foreground/70 leading-relaxed">{a.resumen ?? <span className="italic text-foreground/40">Sin resumen disponible</span>}</p>
                  {a.funcion && (
                    <p className="text-[10px] text-orange-400/60 mt-2 italic">Función: {a.funcion}</p>
                  )}
                </div>
                <div className="flex flex-col divide-y divide-orange-500/15">
                  <div className="p-4 flex flex-col gap-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-400/70 mb-1">Descripción de la avería</p>
                    <p className="text-xs text-foreground/70 leading-relaxed">{a.descripcion ?? <span className="italic text-foreground/40">—</span>}</p>
                  </div>
                  <div className="p-4 flex flex-col gap-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-400/70 mb-1">Solución aplicada</p>
                    <p className="text-xs text-foreground/70 leading-relaxed">{a.solucion ?? <span className="italic text-foreground/40">—</span>}</p>
                  </div>
                  {a.precio_reparacion != null && (
                    <div className="p-4 flex items-center gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-400/70">Precio reparación:</p>
                      <p className="text-sm font-semibold text-orange-300">{a.precio_reparacion} €</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
