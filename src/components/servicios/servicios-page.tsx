import { useState, useEffect } from "react"
import { api, authFetch } from "@/lib/api"
import { PlusCircle, Edit2, Trash2, ToggleRight, ToggleLeft, Search, Layers, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ServicioEditor } from "./servicio-editor"

export interface SubOpcion {
  texto: string
  tipo_problema: string
}

export interface Subservicio {
  nombre: string
  descripcion: string
  icono: string
  es_directo: boolean
  tipo_problema: string
  opciones: SubOpcion[]
}

export interface Servicio {
  id: number
  nombre: string
  descripcion: string
  icono: string
  imagen: string
  orden: number
  activo: boolean
  subservicios: Subservicio[]
  creado_en: string
  actualizado: string
}

const API_URL = `${api("servicios")}?panel=1`

export function ServiciosPage() {
  const [servicios, setServicios]     = useState<Servicio[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [view, setView]               = useState<"list" | "editor">("list")
  const [editando, setEditando]       = useState<Servicio | null>(null)
  const [search, setSearch]           = useState("")
  const [toast, setToast]             = useState<string | null>(null)

  const fetchServicios = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch(API_URL)
      if (!res.ok) throw new Error("Error de conexión")
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setServicios(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo conectar con el servidor.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchServicios() }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este servicio? Esta acción no se puede deshacer.")) return
    try {
      const res = await authFetch(API_URL, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error ?? "Error al eliminar")
      setServicios(prev => prev.filter(s => s.id !== id))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al eliminar el servicio.")
    }
  }

  const handleToggleActivo = async (servicio: Servicio) => {
    try {
      const res = await authFetch(API_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: servicio.id, activo: !servicio.activo,
          nombre: servicio.nombre, descripcion: servicio.descripcion,
          icono: servicio.icono, imagen: servicio.imagen,
          orden: servicio.orden, subservicios: servicio.subservicios }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error ?? "Error")
      setServicios(prev => prev.map(s => s.id === servicio.id ? { ...s, activo: !s.activo } : s))
      showToast(servicio.activo ? "Servicio desactivado" : "Servicio activado")
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al actualizar el estado.")
    }
  }

  const handleSave = async (draft: Omit<Servicio, "id" | "creado_en" | "actualizado">, id?: number) => {
    const method = id ? "PUT" : "POST"
    const body   = id ? { ...draft, id } : draft
    const res = await authFetch(API_URL, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok || json.error) throw new Error(json.error ?? "Error al guardar")
    await fetchServicios()
    setView("list")
    setEditando(null)
    showToast("Servicio guardado correctamente")
  }

  const filtered = servicios.filter(s =>
    s.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (s.descripcion ?? "").toLowerCase().includes(search.toLowerCase())
  )

  if (view === "editor") {
    return (
      <ServicioEditor
        servicio={editando}
        onSave={handleSave}
        onCancel={() => { setView("list"); setEditando(null) }}
      />
    )
  }

  const totalSubs = servicios.reduce((acc, s) => acc + (s.subservicios?.length ?? 0), 0)

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl border border-emerald-500/50 bg-emerald-950 shadow-2xl text-sm font-medium text-emerald-200 transition-all duration-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight neon-title">Servicios</h2>
          <p className="text-muted-foreground mt-1">
            Gestiona el contenido de los servicios de Avantservice.
          </p>
        </div>
        <button
          onClick={() => { setEditando(null); setView("editor") }}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white shadow-lg btn-premium"
        >
          <PlusCircle className="h-4 w-4" />
          Nuevo servicio
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total",        value: servicios.length                          },
          { label: "Activos",      value: servicios.filter(s => s.activo).length    },
          { label: "Sub-servicios", value: totalSubs                                },
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
          placeholder="Buscar por nombre o descripción..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background/50 pl-9 pr-4 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {/* List */}
      <div className="glass-panel rounded-xl border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-foreground animate-pulse font-medium">
            Conectando con la base de datos...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-sm text-red-400 font-medium">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            {search ? "No se encontraron servicios." : "No hay servicios. ¡Crea el primero!"}
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map(s => (
              <div key={s.id} className="flex items-center gap-4 p-4 hover:bg-accent/5 transition-colors">
                {/* Icon */}
                <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg bg-primary/10 text-primary font-mono text-xs">
                  {s.icono}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm text-foreground truncate">{s.nombre}</h3>
                    <span className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0",
                      s.activo
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-zinc-500/10 text-zinc-400"
                    )}>
                      {s.activo ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-1.5">{s.descripcion}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      {s.subservicios?.length ?? 0} sub-servicios
                    </span>
                    <span className="opacity-60">Orden: {s.orden}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { setEditando(s); setView("editor") }}
                    className="p-2 rounded-md text-muted-foreground hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggleActivo(s)}
                    className={cn(
                      "p-2 rounded-md transition-colors",
                      s.activo
                        ? "text-muted-foreground hover:text-zinc-400 hover:bg-zinc-400/10"
                        : "text-muted-foreground hover:text-emerald-400 hover:bg-emerald-400/10"
                    )}
                    title={s.activo ? "Desactivar" : "Activar"}
                  >
                    {s.activo ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
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
