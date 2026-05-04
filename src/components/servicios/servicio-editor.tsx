import { useState, useEffect, useRef } from "react"
import {
  ArrowLeft, Save, Plus, Trash2, ChevronDown,
  AlertCircle, GripVertical, X, Zap, List, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Servicio, Subservicio, SubOpcion } from "./servicios-page"
import { api, authFetch } from "@/lib/api"

interface TipoProblema { id: number; nombre: string }

const ICONOS_COMUNES = [
  "tv", "monitor", "wifi", "zap", "washing-machine", "refrigerator",
  "flame", "fuel", "waves", "thermometer", "wrench", "settings",
  "star", "shield", "cpu", "battery", "radio", "tool",
]

const EMPTY_OPCION: SubOpcion = { texto: "", tipo_problema: "" }
const EMPTY_SUB: Subservicio  = {
  nombre: "", descripcion: "", icono: "wrench",
  es_directo: false, tipo_problema: "", opciones: [],
}

interface Props {
  servicio: Servicio | null
  onSave: (data: Omit<Servicio, "id" | "creado_en" | "actualizado">, id?: number) => Promise<void>
  onCancel: () => void
}

export function ServicioEditor({ servicio, onSave, onCancel }: Props) {
  const [nombre, setNombre]           = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [icono, setIcono]             = useState("wrench")
  const [imagen, setImagen]           = useState("")
  const [orden, setOrden]             = useState(0)
  const [activo, setActivo]           = useState(true)
  const [subs, setSubs]               = useState<Subservicio[]>([])
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [expandedSub, setExpandedSub] = useState<number | null>(null)
  const [tipos, setTipos]             = useState<TipoProblema[]>([])
  const [nuevoTipo, setNuevoTipo]     = useState("")
  const [addingTipo, setAddingTipo]   = useState(false)
  const nuevoTipoRef                  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    authFetch(api("tipos_problema"))
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setTipos(data) })
      .catch(() => {})
  }, [])

  const handleAddTipo = async () => {
    const nombre = nuevoTipo.trim()
    if (!nombre) return
    setAddingTipo(true)
    try {
      const res = await authFetch(api("tipos_problema"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre }),
      })
      const json = await res.json()
      if (!res.ok) { alert(json.error ?? "Error al añadir"); return }
      setTipos(prev => [...prev, json].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setNuevoTipo("")
      nuevoTipoRef.current?.focus()
    } finally {
      setAddingTipo(false)
    }
  }

  useEffect(() => {
    if (servicio) {
      setNombre(servicio.nombre)
      setDescripcion(servicio.descripcion ?? "")
      setIcono(servicio.icono ?? "wrench")
      setImagen(servicio.imagen ?? "")
      setOrden(servicio.orden ?? 0)
      setActivo(servicio.activo)
      setSubs(servicio.subservicios ?? [])
      setExpandedSub(null)
    } else {
      setNombre(""); setDescripcion(""); setIcono("wrench")
      setImagen(""); setOrden(0); setActivo(true); setSubs([])
    }
    setError(null)
  }, [servicio])

  const updateSub    = (i: number, patch: Partial<Subservicio>) =>
    setSubs(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s))

  const addSub = () => {
    setSubs(prev => [...prev, { ...EMPTY_SUB }])
    setExpandedSub(subs.length)
  }

  const removeSub = (i: number) => {
    setSubs(prev => prev.filter((_, idx) => idx !== i))
    setExpandedSub(null)
  }

  const moveSub = (i: number, dir: -1 | 1) => {
    setSubs(prev => {
      const next = [...prev]
      const j = i + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const addOpcion = (si: number) =>
    setSubs(prev => prev.map((s, idx) =>
      idx === si ? { ...s, opciones: [...(s.opciones ?? []), { ...EMPTY_OPCION }] } : s
    ))

  const removeOpcion = (si: number, oi: number) =>
    setSubs(prev => prev.map((s, idx) =>
      idx === si ? { ...s, opciones: s.opciones.filter((_, i) => i !== oi) } : s
    ))

  const updateOpcion = (si: number, oi: number, patch: Partial<SubOpcion>) =>
    setSubs(prev => prev.map((s, idx) =>
      idx === si ? { ...s, opciones: s.opciones.map((o, i) => i === oi ? { ...o, ...patch } : o) } : s
    ))

  const handleSubmit = async () => {
    if (!nombre.trim()) { setError("El nombre del servicio es obligatorio."); return }
    const bad = subs.findIndex(s => !s.nombre.trim())
    if (bad !== -1) {
      setError(`El sub-servicio #${bad + 1} no tiene nombre.`)
      setExpandedSub(bad)
      return
    }
    setError(null)
    setSaving(true)
    try {
      await onSave({ nombre, descripcion, icono, imagen, orden, activo, subservicios: subs }, servicio?.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-400">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </button>
          <span className="h-4 w-px bg-border" />
          <h2 className="text-xl font-bold tracking-tight neon-title">
            {servicio ? "Editar servicio" : "Nuevo servicio"}
          </h2>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium text-white shadow-lg btn-premium disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* ── Datos del servicio ── */}
      <section className="glass-panel rounded-xl p-5 space-y-4 border-l-4 border-primary/60">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-primary/80">
          Servicio principal
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Nombre */}
          <div className="col-span-2">
            <label className="label-xs">Nombre *</label>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej. Televisores"
              className="input-base mt-1.5"
            />
          </div>

          {/* Descripción */}
          <div className="col-span-2">
            <label className="label-xs">Descripción</label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Breve descripción visible en la web"
              rows={2}
              className="input-base mt-1.5 resize-none"
            />
          </div>

          {/* Icono */}
          <div>
            <label className="label-xs">Icono</label>
            <input
              value={icono}
              onChange={e => setIcono(e.target.value)}
              placeholder="tv, wrench, flame…"
              className="input-base mt-1.5 font-mono"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {ICONOS_COMUNES.map(ic => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcono(ic)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] font-mono transition-colors",
                    icono === ic
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "bg-white/5 text-muted-foreground hover:bg-white/10"
                  )}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Imagen + meta */}
          <div className="space-y-3">
            <div>
              <label className="label-xs">Imagen (URL)</label>
              <input
                value={imagen}
                onChange={e => setImagen(e.target.value)}
                placeholder="/img/calderas.jpg"
                className="input-base mt-1.5"
              />
            </div>
            <div className="flex items-center gap-4">
              <div>
                <label className="label-xs">Orden</label>
                <input
                  type="number"
                  value={orden}
                  onChange={e => setOrden(Number(e.target.value))}
                  min={0}
                  className="input-base mt-1.5 w-20 text-center"
                />
              </div>
              {/* Activo toggle */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setActivo(a => !a)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    activo ? "bg-emerald-500" : "bg-border"
                  )}
                >
                  <span className={cn(
                    "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                    activo ? "translate-x-6" : "translate-x-1"
                  )} />
                </button>
                <span className={cn(
                  "ml-2 text-xs",
                  activo ? "text-emerald-400" : "text-muted-foreground"
                )}>
                  {activo ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sub-servicios ── */}
      <section className="glass-panel rounded-xl overflow-hidden border-l-4 border-violet-500/40">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-violet-400/80">
            Sub-servicios
            {subs.length > 0 && (
              <span className="ml-2 text-primary font-bold normal-case tracking-normal">
                ({subs.length})
              </span>
            )}
          </h3>
          <button
            onClick={addSub}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Añadir sub-servicio
          </button>
        </div>

        {subs.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Aún no hay sub-servicios.
          </p>
        ) : (
          <div className="divide-y divide-border/40">
            {subs.map((sub, si) => {
              const open = expandedSub === si
              return (
                <div key={si} className={cn(
                  "border-l-2 transition-colors",
                  sub.es_directo ? "border-amber-500/40" : "border-violet-500/30",
                  open && "bg-white/[0.03]"
                )}>

                  {/* ── Card header ── */}
                  <div className="flex items-center gap-2 px-4 py-3">
                    {/* Drag handle (visual only) */}
                    <GripVertical className="h-4 w-4 text-border shrink-0 cursor-grab" />

                    {/* Expand toggle */}
                    <button
                      onClick={() => setExpandedSub(open ? null : si)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left group"
                    >
                      <ChevronDown className={cn(
                        "h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200",
                        open && "rotate-180"
                      )} />
                      <span className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {sub.nombre || <span className="text-muted-foreground italic font-normal">Sin nombre</span>}
                      </span>
                      <span className={cn(
                        "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0",
                        sub.es_directo
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-violet-500/10 text-violet-400"
                      )}>
                        {sub.es_directo
                          ? <><Zap className="h-2.5 w-2.5" /> Directo</>
                          : <><List className="h-2.5 w-2.5" /> {sub.opciones?.length ?? 0} opciones</>
                        }
                      </span>
                    </button>

                    {/* Order controls */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => moveSub(si, -1)}
                        disabled={si === 0}
                        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-white/5 disabled:opacity-20 transition-colors text-xs leading-none"
                        title="Subir"
                      >↑</button>
                      <button
                        onClick={() => moveSub(si, 1)}
                        disabled={si === subs.length - 1}
                        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-white/5 disabled:opacity-20 transition-colors text-xs leading-none"
                        title="Bajar"
                      >↓</button>
                    </div>

                    <button
                      onClick={() => removeSub(si)}
                      className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* ── Card body (expandible) ── */}
                  {open && (
                    <div className="px-5 pb-5 space-y-5 border-t border-border/30">

                      {/* Campos básicos */}
                      <div className="grid grid-cols-2 gap-3 pt-4">
                        <div>
                          <label className="label-xs">Nombre *</label>
                          <input
                            value={sub.nombre}
                            onChange={e => updateSub(si, { nombre: e.target.value })}
                            placeholder="Problemas de imagen"
                            className="input-base mt-1"
                          />
                        </div>
                        <div>
                          <label className="label-xs">Icono</label>
                          <input
                            value={sub.icono}
                            onChange={e => updateSub(si, { icono: e.target.value })}
                            placeholder="monitor"
                            className="input-base mt-1 font-mono"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="label-xs">Descripción</label>
                          <input
                            value={sub.descripcion}
                            onChange={e => updateSub(si, { descripcion: e.target.value })}
                            placeholder="Pantalla negra, líneas…"
                            className="input-base mt-1"
                          />
                        </div>
                      </div>

                      {/* Tipo: directo vs opciones */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => updateSub(si, { es_directo: false })}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium transition-colors",
                            !sub.es_directo
                              ? "border-violet-500/50 bg-violet-500/10 text-violet-300"
                              : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <List className="h-3.5 w-3.5" /> Con opciones
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSub(si, { es_directo: true })}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium transition-colors",
                            sub.es_directo
                              ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                              : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Zap className="h-3.5 w-3.5" /> Directo (sin opciones)
                        </button>
                      </div>

                      {/* Directo: tipo_problema */}
                      {sub.es_directo && (
                        <div>
                          <label className="label-xs">Tipo de problema</label>
                          <select
                            value={sub.tipo_problema}
                            onChange={e => updateSub(si, { tipo_problema: e.target.value })}
                            className="input-base mt-1 font-mono"
                          >
                            <option value="">— Selecciona —</option>
                            {tipos.map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                          </select>
                        </div>
                      )}

                      {/* Opciones */}
                      {!sub.es_directo && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="label-xs">Opciones</label>
                            <button
                              onClick={() => addOpcion(si)}
                              className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors"
                            >
                              <Plus className="h-3 w-3" /> Añadir opción
                            </button>
                          </div>

                          {(sub.opciones ?? []).length === 0 ? (
                            <p className="text-xs text-muted-foreground italic py-2">
                              Sin opciones todavía.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {sub.opciones.map((op, oi) => (
                                <div key={`${si}-${oi}`} className="flex items-center gap-2 rounded-lg bg-white/[0.03] border border-border/30 px-3 py-2">
                                  <div className="flex-1 grid grid-cols-2 gap-2">
                                    <input
                                      value={op.texto}
                                      onChange={e => updateOpcion(si, oi, { texto: e.target.value })}
                                      placeholder="Texto visible"
                                      className="input-base text-xs"
                                    />
                                    <select
                                      value={op.tipo_problema}
                                      onChange={e => updateOpcion(si, oi, { tipo_problema: e.target.value })}
                                      className="input-base text-xs font-mono"
                                    >
                                      <option value="">— Tipo —</option>
                                      {tipos.map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                                    </select>
                                  </div>
                                  <button
                                    onClick={() => removeOpcion(si, oi)}
                                    className="p-1 text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Tipos de problema ── */}
      <section className="glass-panel rounded-xl p-5 space-y-3 border-l-4 border-amber-500/40">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-amber-400/80">
          Tipos de problema
        </h3>
        <p className="text-xs text-muted-foreground">
          Lista global de tipos disponibles en todos los servicios.
        </p>

        <div className="flex flex-wrap gap-2">
          {tipos.map(t => (
            <span key={t.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-border/40 text-xs font-mono text-foreground">
              {t.nombre}
              <button
                onClick={async () => {
                  if (!confirm(`¿Eliminar "${t.nombre}"?`)) return
                  await authFetch(`${api("tipos_problema")}/${t.id}`, { method: "DELETE" })
                  setTipos(prev => prev.filter(x => x.id !== t.id))
                }}
                className="text-muted-foreground hover:text-red-400 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            ref={nuevoTipoRef}
            value={nuevoTipo}
            onChange={e => setNuevoTipo(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAddTipo()}
            placeholder="nuevo-tipo-problema"
            className="input-base flex-1 font-mono text-sm"
          />
          <button
            onClick={handleAddTipo}
            disabled={addingTipo || !nuevoTipo.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium hover:bg-amber-500/20 transition-colors disabled:opacity-40"
          >
            {addingTipo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Añadir
          </button>
        </div>
      </section>

    </div>
  )
}
