import { useState, useEffect, useRef } from "react"
import { Brain, Plus, Trash2, FileText, Search, Save, X, ChevronRight, Upload, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import "../../avant-premium-theme.css"

interface KnowledgeEntry {
  id: number
  titulo: string
  contenido: string
  categoria: string
  created_at: string
}

const CATEGORIAS = ["General", "Precios", "Procedimientos", "Garantías", "Hardware", "Software"]
const ACCEPTED   = ".pdf,.txt,.md,.csv"

export function RagPage() {
  const [entries, setEntries]       = useState<KnowledgeEntry[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [creating, setCreating]     = useState(false)
  const [saving, setSaving]         = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [dragOver, setDragOver]     = useState(false)
  const [notify, setNotify]         = useState<{ ok: boolean; msg: string } | null>(null)

  const [form, setForm] = useState({ titulo: "", contenido: "", categoria: "General" })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showNotify = (ok: boolean, msg: string) => {
    setNotify({ ok, msg })
    setTimeout(() => setNotify(null), 3500)
  }

  const fetchEntries = () => {
    setLoading(true)
    fetch("http://localhost/backendavant/api.php?r=rag/listar")
      .then(r => r.json())
      .then(data => { setEntries(data.entries ?? []); setLoading(false) })
      .catch(() => { showNotify(false, "No se pudo conectar con el servidor."); setLoading(false) })
  }

  useEffect(() => { fetchEntries() }, [])

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
      const url = creating
        ? "http://localhost/backendavant/api.php?r=rag/crear"
        : "http://localhost/backendavant/api.php?r=rag/actualizar"
      const body = creating ? form : { id: selectedId, ...form }
      const res  = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.success) {
        showNotify(true, creating ? "Documento añadido." : "Documento actualizado.")
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
    await fetch("http://localhost/backendavant/api.php?r=rag/eliminar", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id })
    })
    setEntries(prev => prev.filter(e => e.id !== id))
    if (selectedId === id) { setSelectedId(null); setCreating(false) }
    showNotify(true, "Documento eliminado.")
  }

  const handleFileUpload = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
    if (!["pdf", "txt", "md", "csv"].includes(ext)) {
      showNotify(false, "Formato no soportado. Usa PDF, TXT, MD o CSV.")
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("archivo", file)
      const res  = await fetch("http://localhost/backendavant/api.php?r=rag/subir", { method: "POST", body: fd })
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

  return (
    <div className="flex min-h-[calc(100vh-60px)] flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 avant-premium-layout rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight neon-title">Base de Conocimiento</h2>
          <p className="text-muted-foreground mt-1">
            Documentos que la IA consulta para generar respuestas más precisas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={onFileInputChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium border border-violet-500/40 text-violet-400 hover:bg-violet-500/10 transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Procesando…" : "Subir archivo"}
          </button>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white btn-premium"
          >
            <Plus className="h-4 w-4" /> Nuevo documento
          </button>
        </div>
      </div>

      {notify && (
        <div className={cn(
          "rounded-lg px-4 py-3 text-sm font-medium border",
          notify.ok ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-red-500/10 text-red-400 border-red-500/30"
        )}>
          {notify.msg}
        </div>
      )}

      <div
        className={cn(
          "flex rounded-xl border bg-card shadow-sm glass-panel items-start flex-1 transition-colors",
          dragOver && "border-violet-500/60 bg-violet-500/5"
        )}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >

        {/* LISTA */}
        <div className="w-1/3 flex-shrink-0 flex flex-col border-r bg-background/50 sidebar-glass sticky top-0 max-h-screen">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar documento…"
                className="h-10 w-full rounded-md border border-input bg-transparent pl-9 pr-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {entries.length} documento{entries.length !== 1 ? "s" : ""} · {entries.length} indexado{entries.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="overflow-y-auto max-h-[calc(100vh-220px)]">
            {loading ? (
              <div className="p-8 text-center text-sm text-foreground animate-pulse">Cargando…</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {entries.length === 0 ? "Aún no hay documentos. Crea el primero." : "Sin resultados."}
              </div>
            ) : filtered.map(entry => (
              <button
                key={entry.id}
                onClick={() => handleSelect(entry)}
                className={cn(
                  "w-full text-left p-4 border-b transition-colors hover:bg-muted/50 message-item group",
                  selectedId === entry.id && !creating && "active"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 border border-violet-500/20 font-medium">
                        {entry.categoria}
                      </span>
                    </div>
                    <p className="text-sm font-medium truncate">{entry.titulo}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.contenido}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(entry.id) }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 hover:text-red-400 text-muted-foreground transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* DETALLE / EDITOR */}
        <div className="flex-1 flex flex-col bg-card min-h-[500px]">
          {uploading ? (
            <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-violet-400 opacity-60" />
              <p className="text-sm">Procesando archivo…</p>
            </div>
          ) : (creating || selected) ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/10">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-violet-400" />
                  <span className="text-sm font-semibold">{creating ? "Nuevo documento" : "Editar documento"}</span>
                </div>
                <button onClick={() => { setCreating(false); setSelectedId(null) }} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-4 flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Título</label>
                    <input
                      type="text"
                      value={form.titulo}
                      onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                      placeholder="Ej: Política de garantía de pantallas…"
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Categoría</label>
                    <select
                      value={form.categoria}
                      onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex-1">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Contenido</label>
                  <textarea
                    value={form.contenido}
                    onChange={e => setForm(f => ({ ...f, contenido: e.target.value }))}
                    placeholder="Escribe el conocimiento que la IA debe usar como referencia…"
                    rows={12}
                    className="w-full h-full min-h-[260px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    {form.contenido.length} caracteres · ~{Math.ceil(form.contenido.split(/\s+/).filter(Boolean).length)} palabras
                  </p>
                  <button
                    onClick={handleSave}
                    disabled={saving || !form.titulo.trim() || !form.contenido.trim()}
                    className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white btn-premium disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="flex flex-1 flex-col items-center justify-center text-muted-foreground gap-3 cursor-pointer"
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDrop={onDrop}
            >
              <Upload className="h-12 w-12 opacity-10" />
              <p className="text-sm">Arrastra un archivo aquí o selecciona una opción</p>
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg border border-dashed border-violet-500/40 hover:border-violet-500/70 hover:text-violet-400 transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" /> Subir archivo
                </button>
                <button
                  onClick={handleNew}
                  className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg border border-dashed border-border hover:border-violet-500/50 hover:text-violet-400 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Nuevo documento
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground/50 mt-1">PDF · TXT · MD · CSV</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
