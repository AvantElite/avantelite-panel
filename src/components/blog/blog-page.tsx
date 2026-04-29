import { useState, useEffect } from "react"
import { api, authFetch } from "@/lib/api"
import { PlusCircle, Edit2, Trash2, Eye, CheckCircle2, XCircle, Calendar, Tag, Search, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BlogPost } from "@/types/blog"
import { BlogEditor } from "./blog-editor"
import { BlogPreview } from "./blog-preview"

const API_URL = `${api("blog")}?panel=1`

export function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<"list" | "editor" | "preview">("list")
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)
  const [previewPost, setPreviewPost] = useState<BlogPost | null>(null)
  const [search, setSearch] = useState("")

  const fetchPosts = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch(API_URL)
      if (!res.ok) throw new Error("Error de conexión")
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPosts(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo conectar con el servidor.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta publicación? Esta acción no se puede deshacer.")) return
    try {
      const res = await authFetch(API_URL, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error ?? "Error al eliminar")
      setPosts(prev => prev.filter(p => p.id !== id))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al eliminar la publicación.")
    }
  }

  const handleTogglePublish = async (post: BlogPost) => {
    try {
      const res = await authFetch(API_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...post, publicado: !post.publicado }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error ?? "Error")
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, publicado: !p.publicado } : p))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al actualizar el estado.")
    }
  }

  const handleSave = async (draft: Omit<BlogPost, "id" | "creado_en" | "actualizado">, id?: number) => {
    const method = id ? "PUT" : "POST"
    const body = id ? { ...draft, id } : draft
    const res = await authFetch(API_URL, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok || json.error) throw new Error(json.error ?? "Error al guardar")
    await fetchPosts()
    setView("list")
    setEditingPost(null)
  }

  const filteredPosts = posts.filter(p =>
    p.titulo.toLowerCase().includes(search.toLowerCase()) ||
    p.categoria.toLowerCase().includes(search.toLowerCase()) ||
    p.resumen.toLowerCase().includes(search.toLowerCase())
  )

  if (view === "editor") {
    return (
      <BlogEditor
        post={editingPost}
        onSave={handleSave}
        onCancel={() => { setView("list"); setEditingPost(null) }}
      />
    )
  }

  if (view === "preview" && previewPost) {
    return (
      <BlogPreview
        post={previewPost}
        onBack={() => { setView("list"); setPreviewPost(null) }}
        onEdit={() => { setEditingPost(previewPost); setPreviewPost(null); setView("editor") }}
      />
    )
  }

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight neon-title">Blog</h2>
          <p className="text-muted-foreground mt-1">
            Gestiona las publicaciones del blog de Avantservice.
          </p>
        </div>
        <button
          onClick={() => { setEditingPost(null); setView("editor") }}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white shadow-lg btn-premium"
        >
          <PlusCircle className="h-4 w-4" />
          Nueva publicación
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total", value: posts.length },
          { label: "Publicadas", value: posts.filter(p => p.publicado).length },
          { label: "Borradores", value: posts.filter(p => !p.publicado).length },
          { label: "Destacadas", value: posts.filter(p => p.destacado).length },
        ].map(stat => (
          <div key={stat.label} className="glass-panel rounded-xl p-4 text-center">
            <div className="text-2xl font-bold neon-title">{stat.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por título, categoría o resumen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background/50 pl-9 pr-4 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {/* Post list */}
      <div className="glass-panel rounded-xl border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-foreground animate-pulse font-medium">
            Conectando con la base de datos...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-sm text-red-400 font-medium">{error}</div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            {search ? "No se encontraron publicaciones." : "No hay publicaciones. ¡Crea la primera!"}
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredPosts.map(post => (
              <div key={post.id} className="flex items-center gap-4 p-4 hover:bg-accent/5 transition-colors">
                {/* Emoji */}
                <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                  {post.emoji?.startsWith("http")
                    ? <img src={post.emoji} alt="" className="w-10 h-10 rounded object-cover" />
                    : <span className="text-2xl">{post.emoji}</span>}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm text-foreground truncate">{post.titulo}</h3>
                    {post.destacado && (
                      <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 shrink-0" />
                    )}
                    <span className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0",
                      post.publicado
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-yellow-500/10 text-yellow-400"
                    )}>
                      {post.publicado ? "Publicado" : "Borrador"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-1.5">{post.resumen}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{post.categoria}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(post.fecha).toLocaleDateString("es-ES")}
                    </span>
                    <span className="font-mono opacity-60">/{post.slug}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { setPreviewPost(post); setView("preview") }}
                    className="p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Vista previa"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => { setEditingPost(post); setView("editor") }}
                    className="p-2 rounded-md text-muted-foreground hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleTogglePublish(post)}
                    className={cn(
                      "p-2 rounded-md transition-colors",
                      post.publicado
                        ? "text-muted-foreground hover:text-yellow-400 hover:bg-yellow-400/10"
                        : "text-muted-foreground hover:text-emerald-400 hover:bg-emerald-400/10"
                    )}
                    title={post.publicado ? "Despublicar" : "Publicar"}
                  >
                    {post.publicado ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="p-2 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
