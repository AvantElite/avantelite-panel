import { useState, useEffect, useRef } from "react"
import { api, authFetch } from "@/lib/api"
import { ArrowLeft, Save, Eye, EyeOff, BookOpen, AlertCircle, ImagePlus, X } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import type { BlogPost } from "@/types/blog"
import { CATEGORIAS } from "@/types/blog"

interface BlogEditorProps {
  post: BlogPost | null
  onSave: (draft: Omit<BlogPost, "id" | "creado_en" | "actualizado">, id?: number) => Promise<void>
  onCancel: () => void
}

const today = new Date().toISOString().split("T")[0]

const EMPTY_FORM = {
  titulo: "",
  slug: "",
  categoria: "General" as BlogPost["categoria"],
  resumen: "",
  contenido: "",
  emoji: "🛠️",
  destacado: false,
  publicado: false,
  fecha: today,
}

function toSlug(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

const MARKDOWN_HINTS = `# Título H1\n## Título H2\n**negrita** *cursiva* ~~tachado~~\n\n[enlace](url) ![imagen](url)\n\n\`código inline\`\n\n\`\`\`js\nconsole.log("bloque de código")\n\`\`\`\n\n> Cita o nota importante\n\n- Item de lista\n1. Lista numerada\n\n| Columna 1 | Columna 2 |\n|-----------|-----------|\n| valor     | valor     |`

export function BlogEditor({ post, onSave, onCancel }: BlogEditorProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [autoSlug, setAutoSlug] = useState(true)
  const [uploadingImg, setUploadingImg] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (file: File) => {
    setUploadingImg(true)
    const fd = new FormData()
    fd.append("imagen", file)
    try {
      const res = await authFetch(api("blog/upload-imagen"), { method: "POST", body: fd as unknown as BodyInit })
      const data = await res.json()
      if (data.url) setForm(p => ({ ...p, emoji: data.url }))
      else setSaveError(data.error ?? "Error al subir la imagen.")
    } catch { setSaveError("No se pudo conectar con el servidor.") }
    setUploadingImg(false)
  }

  useEffect(() => {
    if (post) {
      setForm({
        titulo: post.titulo,
        slug: post.slug,
        categoria: post.categoria,
        resumen: post.resumen,
        contenido: post.contenido,
        emoji: post.emoji,
        destacado: Boolean(post.destacado),
        publicado: Boolean(post.publicado),
        fecha: post.fecha,
      })
      setAutoSlug(false)
    } else {
      setForm(EMPTY_FORM)
      setAutoSlug(true)
    }
    setSaveError(null)
  }, [post])

  const handleTituloChange = (titulo: string) => {
    setForm(prev => ({
      ...prev,
      titulo,
      slug: autoSlug ? toSlug(titulo) : prev.slug,
    }))
  }

  const handleSubmit = async (publicado: boolean) => {
    if (!form.titulo.trim()) { setSaveError("El título es obligatorio."); return }
    if (!form.contenido.trim()) { setSaveError("El contenido es obligatorio."); return }
    if (!form.fecha) { setSaveError("La fecha es obligatoria."); return }
    setSaveError(null)
    setSaving(true)
    try {
      await onSave({ ...form, publicado }, post?.id)
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Error al guardar.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
          <div className="h-4 w-px bg-border" />
          <h2 className="text-xl font-bold tracking-tight neon-title">
            {post ? "Editar publicación" : "Nueva publicación"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(p => !p)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors border",
              showPreview
                ? "bg-primary/10 text-primary border-primary/30"
                : "text-muted-foreground border-border hover:bg-accent/10 hover:text-foreground"
            )}
          >
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPreview ? "Ocultar preview" : "Vista previa"}
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Borrador
          </button>
          <button
            onClick={() => handleSubmit(true)}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium text-white shadow-lg btn-premium disabled:opacity-50"
          >
            <BookOpen className="h-4 w-4" />
            {saving ? "Guardando..." : "Publicar"}
          </button>
        </div>
      </div>

      {/* Error alert */}
      {saveError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {saveError}
        </div>
      )}

      <div className={cn("flex gap-4", showPreview ? "flex-row" : "flex-col")}>
        {/* Form */}
        <div className={cn("flex flex-col gap-4", showPreview ? "w-1/2" : "w-full")}>

          {/* Meta fields */}
          <div className="glass-panel rounded-xl p-5 grid grid-cols-2 gap-4">
            {/* Título */}
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Título *</label>
              <input
                type="text"
                value={form.titulo}
                onChange={e => handleTituloChange(e.target.value)}
                placeholder="Título del artículo"
                className="h-10 w-full rounded-lg border border-input bg-background/50 px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Slug (URL)</label>
              <input
                type="text"
                value={form.slug}
                onChange={e => { setAutoSlug(false); setForm(p => ({ ...p, slug: toSlug(e.target.value) })) }}
                placeholder="url-del-articulo"
                className="h-10 w-full rounded-lg border border-input bg-background/50 px-3 text-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Categoría */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Categoría</label>
              <select
                value={form.categoria}
                onChange={e => setForm(p => ({ ...p, categoria: e.target.value as BlogPost["categoria"] }))}
                className="h-10 w-full rounded-lg border border-input bg-background/50 px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Fecha */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Fecha de publicación *</label>
              <input
                type="date"
                value={form.fecha}
                onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                className="h-10 w-full rounded-lg border border-input bg-background/50 px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Imagen de portada */}
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Imagen de portada</label>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]) }} />
              {form.emoji && form.emoji.startsWith("http") ? (
                <div className="relative w-full h-36 rounded-lg overflow-hidden border border-input group">
                  <img src={form.emoji} alt="portada" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors">
                      <ImagePlus className="h-3.5 w-3.5" /> Cambiar
                    </button>
                    <button type="button" onClick={() => setForm(p => ({ ...p, emoji: "🛠️" }))}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors">
                      <X className="h-3.5 w-3.5" /> Quitar
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImg}
                  className="flex flex-col items-center justify-center w-full h-36 rounded-lg border-2 border-dashed border-white/20 bg-white/5 text-muted-foreground hover:border-primary/60 hover:bg-primary/5 hover:text-foreground transition-colors disabled:opacity-50">
                  {uploadingImg ? (
                    <span className="text-sm">Subiendo…</span>
                  ) : (
                    <>
                      <ImagePlus className="h-7 w-7 mb-2 opacity-50" />
                      <span className="text-sm">Haz clic para subir una imagen</span>
                      <span className="text-xs opacity-60 mt-1">JPG, PNG, WebP o GIF · Máx. 5 MB</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Resumen */}
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Resumen</label>
              <textarea
                value={form.resumen}
                onChange={e => setForm(p => ({ ...p, resumen: e.target.value }))}
                placeholder="Breve descripción del artículo (aparece en listados)"
                rows={2}
                className="w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Destacado */}
            <div className="col-span-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, destacado: !p.destacado }))}
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                  form.destacado ? "bg-yellow-400" : "bg-border"
                )}
              >
                <span className={cn(
                  "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
                  form.destacado ? "translate-x-4" : "translate-x-1"
                )} />
              </button>
              <span className="text-sm text-muted-foreground">Artículo destacado</span>
            </div>
          </div>

          {/* Markdown editor */}
          <div className="glass-panel rounded-xl p-5 flex flex-col flex-1 min-h-[300px]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contenido (Markdown) *</label>
              <span className="text-[10px] text-muted-foreground">{form.contenido.length} caracteres</span>
            </div>
            <textarea
              value={form.contenido}
              onChange={e => setForm(p => ({ ...p, contenido: e.target.value }))}
              placeholder={MARKDOWN_HINTS}
              className="flex-1 w-full rounded-lg border border-input bg-background/30 px-3 py-2.5 text-sm font-mono resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring leading-relaxed min-h-[280px]"
            />
          </div>
        </div>

        {/* Live preview */}
        {showPreview && (
          <div className="w-1/2 glass-panel rounded-xl p-6 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 pb-2 border-b border-border/50">Vista previa</p>
            {form.emoji.startsWith("http")
              ? <img src={form.emoji} alt="portada" className="w-full h-44 object-cover rounded-lg mb-3" />
              : <div className="text-3xl mb-3">{form.emoji}</div>}
            <div className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">{form.categoria}</div>
            <h1 className="text-2xl font-bold text-foreground mb-2">{form.titulo || "Sin título"}</h1>
            {form.resumen && <p className="text-muted-foreground text-sm mb-4 italic">{form.resumen}</p>}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-6 pb-4 border-b border-border/50">
              {form.fecha && <span>{new Date(form.fecha).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}</span>}
              {form.destacado && <span className="text-yellow-400">★ Destacado</span>}
            </div>
            <div className="prose prose-sm prose-invert max-w-none blog-markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {form.contenido || "*El contenido aparecerá aquí...*"}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
