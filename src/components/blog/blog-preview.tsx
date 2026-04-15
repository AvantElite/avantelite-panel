import { ArrowLeft, Edit2, Calendar, Tag, Star, CheckCircle2, XCircle } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { BlogPost } from "@/types/blog"
import { cn } from "@/lib/utils"

interface BlogPreviewProps {
  post: BlogPost
  onBack: () => void
  onEdit: () => void
}

export function BlogPreview({ post, onBack, onEdit }: BlogPreviewProps) {
  return (
    <div className="flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Volver al listado
          </button>
          <div className="h-4 w-px bg-border" />
          <span className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
            post.publicado
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-yellow-500/10 text-yellow-400"
          )}>
            {post.publicado
              ? <><CheckCircle2 className="h-3 w-3" />Publicado</>
              : <><XCircle className="h-3 w-3" />Borrador</>
            }
          </span>
          {post.destacado && (
            <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400">
              <Star className="h-3 w-3 fill-yellow-400" />Destacado
            </span>
          )}
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium text-white shadow-lg btn-premium"
        >
          <Edit2 className="h-4 w-4" />
          Editar artículo
        </button>
      </div>

      {/* Article */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-8 max-w-3xl mx-auto">
          {/* Emoji + category */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{post.emoji}</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">{post.categoria}</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-foreground mb-3 leading-tight">{post.titulo}</h1>

          {/* Summary */}
          {post.resumen && (
            <p className="text-muted-foreground text-base mb-5 italic leading-relaxed">{post.resumen}</p>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-6 pb-6 border-b border-border/50">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(post.fecha).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}
            </span>
            <span className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              {post.categoria}
            </span>
            <span className="font-mono opacity-60">/{post.slug}</span>
          </div>

          {/* Markdown content */}
          <div className="prose prose-sm prose-invert max-w-none blog-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.contenido}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}
