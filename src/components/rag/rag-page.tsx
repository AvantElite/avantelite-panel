import { useState, useEffect, useRef } from "react"
import { Brain, Plus, Trash2, FileText, Search, Save, X, Upload, Loader2, Zap, List, Settings, CheckCircle2, AlertCircle, Merge } from "lucide-react"
import { cn } from "@/lib/utils"
import { api, authFetch } from "@/lib/api"
import "../../avant-premium-theme.css"

interface KnowledgeEntry {
  id: number
  titulo: string
  contenido: string
  categoria: string
  created_at: string
  tiene_vector: boolean
}

type Proveedor = "ollama" | "anthropic" | "openai"

interface ModeloInfo {
  name: string
  size: number
  family: string
}

interface Config {
  proveedor_generacion: Proveedor
  modelo_generacion: string
  proveedor_embeddings: Proveedor
  modelo_embeddings: string
  anthropic_key_set: boolean
  openai_key_set: boolean
}

const PROVEEDORES_GEN: { value: Proveedor; label: string }[] = [
  { value: "ollama",    label: "Ollama (local)"  },
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "openai",   label: "OpenAI (GPT)"     },
]

const PROVEEDORES_EMB: { value: Proveedor; label: string }[] = [
  { value: "ollama",  label: "Ollama (local)"    },
  { value: "openai",  label: "OpenAI Embeddings" },
]

const MODELOS_SUGERIDOS: Record<Proveedor, string[]> = {
  ollama:    [],
  anthropic: ["claude-haiku-4-5-20251001", "claude-sonnet-4-6", "claude-opus-4-7"],
  openai:    ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"],
}

const MODELOS_EMB_SUGERIDOS: Record<Proveedor, string[]> = {
  ollama:    [],
  openai:    ["text-embedding-3-small", "text-embedding-3-large"],
  anthropic: [],
}

const CFG_VACIA: Config = {
  proveedor_generacion: "ollama", modelo_generacion: "",
  proveedor_embeddings: "ollama", modelo_embeddings: "",
  anthropic_key_set: false, openai_key_set: false,
}

const CATEGORIAS = ["General", "Precios", "Procedimientos", "Garantías", "Hardware", "Software"]
const ACCEPTED   = ".txt,.md,.csv"


export function RagPage({ initialId = null, onOpen }: { initialId?: number | null; onOpen?: () => void }) {
  const [entries, setEntries]           = useState<KnowledgeEntry[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState("")
  const [selectedId, setSelectedId]     = useState<number | null>(null)
  const [creating, setCreating]         = useState(false)
  const [saving, setSaving]             = useState(false)
  const [uploading, setUploading]       = useState(false)
  const [dragOver, setDragOver]         = useState(false)
  const [notify, setNotify]             = useState<{ ok: boolean; msg: string } | null>(null)
  const [ragModo, setRagModo]           = useState<"completo" | "semantico">(() => (localStorage.getItem("rag_modo") as "completo" | "semantico") ?? "completo")
  const [vectorizando, setVectorizando] = useState(false)
  const [showConfig, setShowConfig]     = useState(false)
  const [config, setConfig]             = useState<Config>(CFG_VACIA)
  const [modelosOllama, setModelosOllama] = useState<ModeloInfo[]>([])
  const [savingConfig, setSavingConfig] = useState(false)
  const [configDraft, setConfigDraft]   = useState<Config>(CFG_VACIA)

  const [form, setForm] = useState({ titulo: "", contenido: "", categoria: "General" })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Combinar documentos
  const [showMerge, setShowMerge]         = useState(false)
  const [mergeIds, setMergeIds]           = useState<Set<number>>(new Set())
  const [mergeTitulo, setMergeTitulo]     = useState("")
  const [mergeCategoria, setMergeCategoria] = useState("General")
  const [mergeDeleteOrig, setMergeDeleteOrig] = useState(true)
  const [merging, setMerging]             = useState(false)

  const showNotify = (ok: boolean, msg: string) => {
    setNotify({ ok, msg })
    setTimeout(() => setNotify(null), 4000)
  }

  const fetchEntries = () => {
    setLoading(true)
    authFetch(api("rag/listar"))
      .then(r => r.json())
      .then(data => { setEntries(data.entries ?? []); setLoading(false) })
      .catch(() => { showNotify(false, "No se pudo conectar con el servidor."); setLoading(false) })
  }

  const fetchConfig = () => {
    authFetch(api("config/get"))
      .then(r => r.json())
      .then(data => {
        if (data.config) {
          const merged: Config = { ...CFG_VACIA, ...data.config }
          setConfig(merged)
          setConfigDraft(merged)
        }
        setModelosOllama(data.modelos_ollama ?? [])
      })
      .catch(() => {})
  }

  useEffect(() => { fetchEntries(); fetchConfig() }, [])

  useEffect(() => {
    if (initialId && entries.length > 0) {
      const entry = entries.find(e => e.id === initialId)
      if (entry) { handleSelect(entry); onOpen?.() }
    }
  }, [initialId, entries])

  const selected = entries.find(e => e.id === selectedId)

  const filtered = entries.filter(e => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return e.titulo.toLowerCase().includes(q) || e.contenido.toLowerCase().includes(q) || e.categoria.toLowerCase().includes(q)
  })

  const handleNew = () => {
    setSelectedId(null)
    setForm({ titulo: "", contenido: "", categoria: "General" })
    setCreating(true)
  }

  const handleSelect = (entry: KnowledgeEntry) => {
    setCreating(false)
    setSelectedId(entry.id)
    setForm({ titulo: entry.titulo, contenido: entry.contenido, categoria: entry.categoria })
  }

  const handleSave = async () => {
    if (!form.titulo.trim() || !form.contenido.trim()) return
    setSaving(true)
    try {
      const url  = creating ? api("rag/crear") : api("rag/actualizar")
      const body = creating ? form : { id: selectedId, ...form }
      const res  = await authFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.success) {
        const vecMsg = data.vectorizado === false ? " (sin vectorizar — Ollama no disponible)" : ""
        showNotify(true, (creating ? "Documento añadido." : "Documento actualizado.") + vecMsg)
        fetchEntries()
        if (creating) { setCreating(false); setSelectedId(data.id ?? null) }
      } else {
        showNotify(false, data.error ?? "Error al guardar.")
      }
    } catch { showNotify(false, "No se pudo conectar con el servidor.") }
    setSaving(false)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este documento de la base de conocimiento?")) return
    await authFetch(api("rag/eliminar"), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id })
    })
    setEntries(prev => prev.filter(e => e.id !== id))
    if (selectedId === id) { setSelectedId(null); setCreating(false) }
    showNotify(true, "Documento eliminado.")
  }

  const handleFileUpload = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
    if (!["txt", "md", "csv"].includes(ext)) {
      showNotify(false, "Formato no soportado. Usa TXT, MD o CSV.")
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("archivo", file)
      const res  = await authFetch(api("rag/subir"), { method: "POST", body: fd as unknown as BodyInit })
      const data = await res.json()
      if (data.titulo !== undefined) {
        setSelectedId(null)
        setForm({ titulo: data.titulo, contenido: data.contenido, categoria: "General" })
        setCreating(true)
        showNotify(true, `Archivo "${file.name}" procesado. Revisa el contenido y guarda.`)
      } else {
        showNotify(false, data.error ?? "No se pudo procesar el archivo.")
      }
    } catch { showNotify(false, "Error al subir el archivo.") }
    setUploading(false)
  }

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
    e.target.value = ""
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileUpload(file)
  }

  const switchModo = (modo: "completo" | "semantico") => {
    setRagModo(modo)
    localStorage.setItem("rag_modo", modo)
  }

  const vectorizarTodo = async () => {
    setVectorizando(true)
    try {
      const res  = await authFetch(api("rag/vectorizar_todo"), { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      const data = await res.json()
      if (data.success) {
        showNotify(true, `Vectorización completa: ${data.vectorizados} docs procesados${data.fallidos ? `, ${data.fallidos} fallidos` : ""}.`)
        fetchEntries()
      } else showNotify(false, data.error ?? "Error al vectorizar.")
    } catch { showNotify(false, "No se pudo conectar con el servidor.") }
    setVectorizando(false)
  }

  const handleSaveConfig = async () => {
    setSavingConfig(true)
    try {
      const res  = await authFetch(api("config/set"), {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(configDraft)
      })
      const data = await res.json()
      if (data.success) {
        setConfig(configDraft)
        let msg = "Configuración guardada."
        if (data.embeddings_reset) msg += " Vectores borrados — pulsa 'Vectorizar todo' para regenerarlos."
        showNotify(true, msg)
        fetchEntries()
        setShowConfig(false)
      } else showNotify(false, data.error ?? "Error al guardar configuración.")
    } catch { showNotify(false, "No se pudo conectar.") }
    setSavingConfig(false)
  }

  const sinVectorizar = entries.filter(e => !e.tiene_vector).length

  const categorias = [...new Set(entries.map(e => e.categoria))].sort()

  const selectMergeByCategory = (cat: string) => {
    const ids = entries.filter(e => e.categoria === cat).map(e => e.id)
    setMergeIds(new Set(ids))
    setMergeCategoria(cat)
    setMergeTitulo(`Resumen — ${cat}`)
  }

  const toggleMergeId = (id: number) => {
    setMergeIds(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const handleMerge = async () => {
    if (mergeIds.size < 2 || !mergeTitulo.trim()) return
    setMerging(true)
    try {
      const seleccionados = entries.filter(e => mergeIds.has(e.id))
      const contenidoCombinado = seleccionados
        .map(e => `### ${e.titulo}\n${e.contenido}`)
        .join("\n\n---\n\n")
      const res = await authFetch(api("rag/crear"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: mergeTitulo, contenido: contenidoCombinado, categoria: mergeCategoria })
      })
      const data = await res.json()
      if (!data.success) { showNotify(false, data.error ?? "Error al combinar."); setMerging(false); return }
      if (mergeDeleteOrig) {
        for (const id of mergeIds) {
          await authFetch(api("rag/eliminar"), {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id })
          })
        }
      }
      showNotify(true, `${seleccionados.length} documentos combinados en "${mergeTitulo}".`)
      setShowMerge(false)
      setMergeIds(new Set())
      setMergeTitulo("")
      fetchEntries()
      setSelectedId(data.id ?? null)
    } catch { showNotify(false, "Error al combinar documentos.") }
    setMerging(false)
  }

  const keyOk = (prov: Proveedor) =>
    (prov === "anthropic" && config.anthropic_key_set) || (prov === "openai" && config.openai_key_set)

  return (
    <div className="flex min-h-[calc(100vh-60px)] flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 avant-premium-layout rounded-xl p-4">

      {/* ── Cabecera ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20">
            <Brain className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight neon-title leading-none">Base de Conocimiento</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Documentos que la IA consulta al responder</p>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            <strong className="text-foreground">{entries.length}</strong> documento{entries.length !== 1 ? "s" : ""}
          </span>
          {ragModo === "semantico" && (
            <span className={cn("flex items-center gap-1.5", sinVectorizar > 0 ? "text-amber-400" : "text-green-400")}>
              <Zap className="h-3.5 w-3.5" />
              {sinVectorizar > 0 ? `${sinVectorizar} sin vectorizar` : "Todo vectorizado"}
            </span>
          )}
        </div>
      </div>

      {/* ── Barra de acciones ── */}
      <div className="flex items-center gap-2 flex-wrap rounded-xl border border-border/50 bg-muted/20 px-3 py-2">

        {/* Modo RAG */}
        <div className="flex items-center rounded-lg border border-border overflow-hidden text-xs">
          <button
            onClick={() => switchModo("completo")}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 transition-colors", ragModo === "completo" ? "bg-violet-500/20 text-violet-300 font-medium" : "text-muted-foreground hover:bg-muted/50")}
            title="Incluye todos los documentos en el prompt"
          >
            <List className="h-3.5 w-3.5" /> Completo
          </button>
          <div className="w-px h-5 bg-border" />
          <button
            onClick={() => switchModo("semantico")}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 transition-colors", ragModo === "semantico" ? "bg-violet-500/20 text-violet-300 font-medium" : "text-muted-foreground hover:bg-muted/50")}
            title="Busca los documentos más relevantes por similitud semántica"
          >
            <Zap className="h-3.5 w-3.5" /> Semántico
          </button>
        </div>

        {/* Vectorizar */}
        {ragModo === "semantico" && (
          <button
            onClick={vectorizarTodo}
            disabled={vectorizando}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border border-violet-500/30 text-violet-400 hover:bg-violet-500/10 transition-colors disabled:opacity-50"
          >
            {vectorizando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
            {vectorizando ? "Vectorizando…" : sinVectorizar > 0 ? `Vectorizar (${sinVectorizar})` : "Vectorizar todo"}
          </button>
        )}

        <div className="flex-1" />

        {/* Configuración */}
        <button
          onClick={() => setShowConfig(v => !v)}
          className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors",
            showConfig ? "border-violet-500/60 bg-violet-500/10 text-violet-300" : "border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground")}
        >
          <Settings className="h-3.5 w-3.5" /> Configuración IA
        </button>

        <div className="w-px h-5 bg-border/60" />

        {/* Subir archivo */}
        <input ref={fileInputRef} type="file" accept={ACCEPTED} className="hidden" onChange={onFileInputChange} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "Procesando…" : "Subir archivo"}
        </button>

        {/* Combinar */}
        <button
          onClick={() => { setShowMerge(v => !v); setMergeIds(new Set()) }}
          disabled={entries.length < 2}
          className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors disabled:opacity-40",
            showMerge ? "border-violet-500/60 bg-violet-500/10 text-violet-300" : "border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground")}
        >
          <Merge className="h-3.5 w-3.5" /> Combinar
        </button>

        {/* Nuevo documento */}
        <button onClick={handleNew} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white btn-premium">
          <Plus className="h-3.5 w-3.5" /> Nuevo documento
        </button>
      </div>

      {/* ── Panel configuración ── */}
      {showConfig && (
        <div className="rounded-xl border border-violet-500/20 bg-card shadow-sm overflow-hidden">
          {/* Header config */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/60 bg-violet-500/5">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-violet-400" />
              <span className="text-sm font-semibold">Configuración de IA</span>
              <span className="text-xs text-muted-foreground">— proveedor y modelo activos</span>
            </div>
            <button onClick={() => setShowConfig(false)} className="text-muted-foreground hover:text-foreground rounded p-0.5 hover:bg-muted/50 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 grid grid-cols-1 gap-5 lg:grid-cols-2">

            {/* ── Generación ── */}
            <div className="rounded-lg border border-violet-500/15 bg-violet-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-violet-500/10">
                <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Generación</p>
                <span className="text-xs text-muted-foreground font-normal">sugerencias del chat</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Proveedor</label>
                  <select
                    value={configDraft.proveedor_generacion}
                    onChange={e => setConfigDraft(d => ({ ...d, proveedor_generacion: e.target.value as Proveedor, modelo_generacion: "" }))}
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {PROVEEDORES_GEN.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Modelo</label>
                  {configDraft.proveedor_generacion === "ollama" ? (
                    <select
                      value={configDraft.modelo_generacion}
                      onChange={e => setConfigDraft(d => ({ ...d, modelo_generacion: e.target.value }))}
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {modelosOllama.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={configDraft.modelo_generacion}
                      onChange={e => setConfigDraft(d => ({ ...d, modelo_generacion: e.target.value }))}
                      placeholder={MODELOS_SUGERIDOS[configDraft.proveedor_generacion][0] ?? "nombre-del-modelo"}
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  )}
                </div>
              </div>

              {configDraft.proveedor_generacion !== "ollama" && (
                <>
                  <div className="flex flex-wrap gap-1">
                    {(MODELOS_SUGERIDOS[configDraft.proveedor_generacion] ?? []).map(m => (
                      <button key={m} onClick={() => setConfigDraft(d => ({ ...d, modelo_generacion: m }))}
                        className={cn("text-[10px] px-1.5 py-0.5 rounded border transition-colors", configDraft.modelo_generacion === m ? "border-violet-500/60 bg-violet-500/15 text-violet-300" : "border-border text-muted-foreground hover:border-violet-500/40")}>
                        {m}
                      </button>
                    ))}
                  </div>
                  <div className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px]",
                    keyOk(configDraft.proveedor_generacion) ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20")}>
                    {keyOk(configDraft.proveedor_generacion)
                      ? <><CheckCircle2 className="h-3 w-3 shrink-0" /> API Key configurada</>
                      : <><AlertCircle className="h-3 w-3 shrink-0" /> Sin API Key — configúrala en <code className="font-mono">.env</code></>}
                  </div>
                </>
              )}
            </div>

            {/* ── Embeddings ── */}
            <div className="rounded-lg border border-cyan-500/15 bg-cyan-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-cyan-500/10">
                <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Embeddings</p>
                <span className="text-xs text-muted-foreground font-normal">búsqueda semántica</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Proveedor</label>
                  <select
                    value={configDraft.proveedor_embeddings}
                    onChange={e => setConfigDraft(d => ({ ...d, proveedor_embeddings: e.target.value as Proveedor, modelo_embeddings: "" }))}
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {PROVEEDORES_EMB.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Modelo</label>
                  {configDraft.proveedor_embeddings === "ollama" ? (
                    <select
                      value={configDraft.modelo_embeddings}
                      onChange={e => setConfigDraft(d => ({ ...d, modelo_embeddings: e.target.value }))}
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {modelosOllama.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={configDraft.modelo_embeddings}
                      onChange={e => setConfigDraft(d => ({ ...d, modelo_embeddings: e.target.value }))}
                      placeholder={MODELOS_EMB_SUGERIDOS[configDraft.proveedor_embeddings][0] ?? "nombre-del-modelo"}
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  )}
                </div>
              </div>

              {configDraft.proveedor_embeddings !== "ollama" && (
                <>
                  <div className="flex flex-wrap gap-1">
                    {(MODELOS_EMB_SUGERIDOS[configDraft.proveedor_embeddings] ?? []).map(m => (
                      <button key={m} onClick={() => setConfigDraft(d => ({ ...d, modelo_embeddings: m }))}
                        className={cn("text-[10px] px-1.5 py-0.5 rounded border transition-colors", configDraft.modelo_embeddings === m ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-300" : "border-border text-muted-foreground hover:border-cyan-500/40")}>
                        {m}
                      </button>
                    ))}
                  </div>
                  <div className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px]",
                    config.openai_key_set ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20")}>
                    {config.openai_key_set
                      ? <><CheckCircle2 className="h-3 w-3 shrink-0" /> API Key configurada</>
                      : <><AlertCircle className="h-3 w-3 shrink-0" /> Sin API Key — configúrala en <code className="font-mono">.env</code></>}
                  </div>
                </>
              )}

              {(configDraft.proveedor_embeddings !== config.proveedor_embeddings || configDraft.modelo_embeddings !== config.modelo_embeddings) && (
                <div className="flex items-start gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5 text-[11px] text-amber-400">
                  <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                  Cambiar embeddings borrará los vectores existentes. Habrá que re-vectorizar.
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between px-5 py-3 border-t border-border/60 bg-muted/10">
            <p className="text-xs text-muted-foreground/60 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {modelosOllama.length} modelo{modelosOllama.length !== 1 ? "s" : ""} local{modelosOllama.length !== 1 ? "es" : ""} en Ollama
            </p>
            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white btn-premium disabled:opacity-40 disabled:pointer-events-none"
            >
              {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {savingConfig ? "Guardando…" : "Guardar configuración"}
            </button>
          </div>
        </div>
      )}

      {/* Notificación */}
      {notify && (
        <div className={cn("rounded-lg px-4 py-2.5 text-sm font-medium border flex items-center gap-2", notify.ok ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-red-500/10 text-red-400 border-red-500/30")}>
          {notify.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {notify.msg}
        </div>
      )}

      {/* ── Panel combinar ── */}
      {showMerge && (
        <div className="rounded-xl border border-violet-500/20 bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/60 bg-violet-500/5">
            <div className="flex items-center gap-2">
              <Merge className="h-4 w-4 text-violet-400" />
              <span className="text-sm font-semibold">Combinar documentos</span>
              <span className="text-xs text-muted-foreground">— fusiona varios en uno</span>
            </div>
            <button onClick={() => setShowMerge(false)} className="text-muted-foreground hover:text-foreground rounded p-0.5 hover:bg-muted/50 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Selección rápida por categoría */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Seleccionar todos los de una categoría:</p>
              <div className="flex flex-wrap gap-1.5">
                {categorias.map(cat => {
                  const count = entries.filter(e => e.categoria === cat).length
                  if (count < 2) return null
                  return (
                    <button
                      key={cat}
                      onClick={() => selectMergeByCategory(cat)}
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-full border transition-colors",
                        entries.filter(e => e.categoria === cat).every(e => mergeIds.has(e.id))
                          ? "border-violet-500/60 bg-violet-500/15 text-violet-300"
                          : "border-border text-muted-foreground hover:border-violet-500/40 hover:text-violet-300"
                      )}
                    >
                      {cat} <span className="opacity-60">({count})</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Lista de documentos seleccionables */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                O selecciona individualmente — <span className="text-violet-400">{mergeIds.size} seleccionados</span>:
              </p>
              <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto pr-1">
                {entries.map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => toggleMergeId(entry.id)}
                    className={cn(
                      "flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors",
                      mergeIds.has(entry.id)
                        ? "border-violet-500/40 bg-violet-500/10 text-violet-200"
                        : "border-border/40 hover:border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className={cn("h-3.5 w-3.5 shrink-0 rounded border flex items-center justify-center transition-colors",
                      mergeIds.has(entry.id) ? "border-violet-400 bg-violet-500/30" : "border-muted-foreground/40")}>
                      {mergeIds.has(entry.id) && <CheckCircle2 className="h-2.5 w-2.5 text-violet-300" />}
                    </div>
                    <span className="truncate font-medium">{entry.titulo}</span>
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/15 ml-auto">
                      {entry.categoria}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Opciones del documento resultante */}
            {mergeIds.size >= 2 && (
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/50">
                <div className="col-span-2">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block font-medium">Título del documento combinado</label>
                  <input
                    type="text"
                    value={mergeTitulo}
                    onChange={e => setMergeTitulo(e.target.value)}
                    placeholder="Ej: Procedimientos completos — Hardware"
                    maxLength={200}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block font-medium">Categoría</label>
                  <select
                    value={mergeCategoria}
                    onChange={e => setMergeCategoria(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {mergeIds.size >= 2 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border/60 bg-muted/10">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={mergeDeleteOrig}
                  onChange={e => setMergeDeleteOrig(e.target.checked)}
                  className="rounded border-border"
                />
                Eliminar los documentos originales tras combinar
              </label>
              <button
                onClick={handleMerge}
                disabled={merging || !mergeTitulo.trim()}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white btn-premium disabled:opacity-40 disabled:pointer-events-none"
              >
                {merging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Merge className="h-4 w-4" />}
                {merging ? "Combinando…" : `Combinar ${mergeIds.size} documentos`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Panel principal ── */}
      <div
        className={cn("flex rounded-xl border bg-card shadow-sm glass-panel flex-1 overflow-hidden transition-colors", dragOver && "border-violet-500/60 bg-violet-500/5")}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {/* ── LISTA ── */}
        <div className="w-72 flex-shrink-0 flex flex-col border-r bg-background/40">
          {/* Buscador */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar…"
                className="h-8 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* Lista de documentos */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-6 text-center text-xs text-muted-foreground animate-pulse">Cargando…</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                {entries.length === 0 ? "Aún no hay documentos." : "Sin resultados."}
              </div>
            ) : filtered.map(entry => (
              <button
                key={entry.id}
                onClick={() => handleSelect(entry)}
                className={cn("w-full text-left px-3 py-2.5 border-b border-border/40 transition-colors hover:bg-muted/40 group relative", selectedId === entry.id && !creating && "bg-violet-500/10 border-l-2 border-l-violet-500")}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate leading-snug">{entry.titulo}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] px-1 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/15">
                        {entry.categoria}
                      </span>
                      {entry.tiene_vector && (
                        <span className="text-[10px] text-cyan-500/80 flex items-center gap-0.5">
                          <Zap className="h-2.5 w-2.5" /> vec
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(entry.id) }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 hover:text-red-400 text-muted-foreground transition-all shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </button>
            ))}
          </div>

          {/* Pie de lista */}
          <div className="px-3 py-2 border-t border-border/40 bg-muted/10">
            <p className="text-[10px] text-muted-foreground/60">
              {filtered.length} de {entries.length} documento{entries.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* ── EDITOR ── */}
        <div className="flex-1 flex flex-col min-h-[500px]">
          {uploading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-violet-400 opacity-60" />
              <p className="text-sm">Procesando archivo…</p>
            </div>

          ) : (creating || selected) ? (
            <div className="flex flex-col h-full">
              {/* Header editor */}
              <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/10">
                <div className="flex items-center gap-2">
                  <div className={cn("h-2 w-2 rounded-full", creating ? "bg-green-400" : "bg-violet-400")} />
                  <span className="text-sm font-semibold">{creating ? "Nuevo documento" : "Editar documento"}</span>
                </div>
                <button onClick={() => { setCreating(false); setSelectedId(null) }} className="text-muted-foreground hover:text-foreground rounded p-0.5 hover:bg-muted/50 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Campos */}
              <div className="p-5 flex flex-col gap-4 flex-1">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block font-medium">Título</label>
                    <input
                      type="text"
                      value={form.titulo}
                      onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                      placeholder="Ej: Política de garantía de pantallas…"
                      maxLength={200}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block font-medium">Categoría</label>
                    <select
                      value={form.categoria}
                      onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block font-medium">Contenido</label>
                  <textarea
                    value={form.contenido}
                    onChange={e => setForm(f => ({ ...f, contenido: e.target.value }))}
                    placeholder="Escribe el conocimiento que la IA usará como referencia…"
                    maxLength={50000}
                    className="flex-1 w-full min-h-[240px] rounded-md border border-input bg-background px-3 py-2.5 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    {form.contenido.length} car. · ~{Math.ceil(form.contenido.split(/\s+/).filter(Boolean).length)} palabras
                  </p>
                  <button
                    onClick={handleSave}
                    disabled={saving || !form.titulo.trim() || !form.contenido.trim()}
                    className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium text-white btn-premium disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              </div>
            </div>

          ) : (
            /* Estado vacío */
            <div
              className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground cursor-pointer"
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDrop={onDrop}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20">
                <Upload className="h-7 w-7 opacity-30" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Arrastra un archivo aquí</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">TXT · MD · CSV</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-dashed border-violet-500/40 hover:border-violet-500/70 hover:text-violet-400 transition-colors"
                >
                  <Upload className="h-3 w-3" /> Subir archivo
                </button>
                <span className="text-muted-foreground/40 text-xs">o</span>
                <button
                  onClick={handleNew}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-dashed border-border hover:border-violet-500/50 hover:text-violet-400 transition-colors"
                >
                  <Plus className="h-3 w-3" /> Escribir manualmente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
