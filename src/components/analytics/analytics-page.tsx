import { useState, useEffect, useCallback } from "react"
import { api, authFetch } from "@/lib/api"
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend,
} from "recharts"
import {
  TrendingUp, TrendingDown, Eye, Users, MousePointerClick,
  Clock, Layers, Smartphone, Monitor, Tablet,
  RefreshCw, AlertTriangle, Globe, BarChart2, Activity,
  Download, Zap, ArrowUpRight,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

// ─── Types ────────────────────────────────────────────────────────────────────

type RangeKey  = "7" | "30" | "90"
type GranKey   = "day" | "week" | "month"

interface KpiValue { curr: number; prev: number; trend: number | null }

interface AnalyticsData {
  has_data: boolean
  kpis: {
    visitas:        KpiValue
    usuarios:       KpiValue
    sesiones:       KpiValue
    rebote:         KpiValue
    tiempo_medio:   KpiValue
    paginas_sesion: KpiValue
    scroll_medio:   number
  }
  temporal:       { label: string; visitas: number; usuarios: number; anomalia: boolean }[]
  temporal_prev:  { label: string; visitas: number; usuarios: number }[]
  fuentes:        { name: string; value: number }[]
  fuentes_tiempo: Record<string, any>[]
  dispositivos:   { name: string; value: number }[]
  navegadores:    { name: string; value: number }[]
  sistemas:       { name: string; value: number }[]
  paises:         { name: string; value: number }[]
  paginas: {
    pagina: string; visitas: number; visitas_prev: number
    usuarios: number; tiempo_medio: number; scroll_medio: number; trend: number | null
  }[]
  eventos_tipo:   { name: string; value: number }[]
  eventos_top:    { tipo: string; label: string; total: number }[]
  eventos_tiempo: Record<string, any>[]
  scroll_paginas: { pagina: string; scroll: number }[]
}

const API = api("analytics")

// ─── Palettes ─────────────────────────────────────────────────────────────────

const C = {
  cyan:   "#00f0ff",
  blue:   "#0057ff",
  purple: "#a855f7",
  pink:   "#ec4899",
  green:  "#10b981",
  amber:  "#f59e0b",
  rose:   "#f43f5e",
  sky:    "#06b6d4",
}
const PIE_COLORS = Object.values(C)

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "rgba(11, 15, 25, 0.97)",
    border: "1px solid rgba(0,240,255,0.15)",
    borderRadius: "12px",
    backdropFilter: "blur(16px)",
    fontSize: "12px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
  },
  itemStyle: { color: "#e2e8f0" },
  labelStyle: { color: "#00f0ff", fontWeight: 700, marginBottom: 4 },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(s: number | null | undefined) {
  if (s == null || s === 0) return "—"
  const n = Math.round(s)
  if (n < 60) return `${n}s`
  return `${Math.floor(n / 60)}m ${n % 60}s`
}

function trendColor(v: number | null, inverse = false) {
  if (v === null) return "text-muted-foreground"
  const positive = inverse ? v <= 0 : v >= 0
  return positive ? "text-emerald-400" : "text-rose-400"
}

function trendIcon(v: number | null, inverse = false) {
  if (v === null) return null
  const positive = inverse ? v <= 0 : v >= 0
  return positive
    ? <TrendingUp className="h-3 w-3 text-emerald-400" />
    : <TrendingDown className="h-3 w-3 text-rose-400" />
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  title, value, sub, icon: Icon, color, kpi, inverse = false, large = false,
}: {
  title: string; value: string; sub: string
  icon: React.ElementType; color: string
  kpi?: KpiValue; inverse?: boolean; large?: boolean
}) {
  return (
    <Card className="glass-panel group relative overflow-hidden transition-all hover:scale-[1.02]">
      <CardContent className={large ? "pt-5 pb-4" : "pt-5 pb-4"}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-2xl font-bold tracking-tight text-foreground mt-0.5">{value}</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">{sub}</p>
          </div>
          <div className="shrink-0 rounded-xl p-2.5" style={{ backgroundColor: `${color}18` }}>
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
        </div>
        {kpi && kpi.trend !== null && (
          <div className="mt-3 flex items-center gap-1 flex-wrap">
            {trendIcon(kpi.trend, inverse)}
            <span className={`text-xs font-semibold ${trendColor(kpi.trend, inverse)}`}>
              {kpi.trend > 0 ? "+" : ""}{kpi.trend}%
            </span>
            <span className="text-xs text-muted-foreground/50 ml-0.5">vs periodo anterior</span>
          </div>
        )}
      </CardContent>
      <div className="absolute bottom-0 left-0 h-[2px] w-0 transition-all duration-500 group-hover:w-full"
        style={{ backgroundColor: color }} />
    </Card>
  )
}


// Custom dot para anomalías
function AnomalyDot(props: any) {
  const { cx, cy, payload } = props
  if (!payload?.anomalia) return null
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill="rgba(244,63,94,0.15)" stroke="#f43f5e" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={3} fill="#f43f5e" />
    </g>
  )
}

// Rounded bar shape
function RoundBar(props: any) {
  const { x, y, width, height, fill } = props
  if (!height || height <= 0) return null
  const r = Math.min(5, width / 2)
  return <path d={`M${x},${y+height} L${x},${y+r} Q${x},${y} ${x+r},${y} L${x+width-r},${y} Q${x+width},${y} ${x+width},${y+r} L${x+width},${y+height} Z`} fill={fill} />
}

// ─── No-data state ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <div className="glass-panel rounded-2xl p-10 text-center max-w-lg space-y-4">
        <Activity className="h-12 w-12 text-[#00f0ff] mx-auto opacity-60" />
        <div>
          <h2 className="neon-title text-xl font-black mb-2">Esperando primeras visitas</h2>
          <p className="text-sm text-muted-foreground">
            El tracker está instalado en Avantservice. En cuanto alguien visite el sitio,
            los datos aparecerán aquí automáticamente.
          </p>
        </div>
        <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-4 text-left space-y-2">
          <p className="text-xs font-semibold text-[#00f0ff] mb-2">Tracker activo en:</p>
          {["index.html", "blog.html", "tv.html", "calderas.html", "electrodomesticos.html", "articulo.html", "success.html"].map(p => (
            <div key={p} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
              {p}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground/50">
          Abre el sitio Avantservice en un navegador para generar los primeros datos.
        </p>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const [range, setRange]   = useState<RangeKey>("30")
  const [gran, setGran]     = useState<GranKey>("day")
  const [tab, setTab]       = useState<"overview" | "sources" | "devices" | "pages" | "events">("overview")
  const [data, setData]     = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res  = await authFetch(`${API}?range=${range}&gran=${gran}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
    } catch (e: any) {
      setError(e.message ?? "Error desconocido")
    } finally {
      setLoading(false)
    }
  }, [range, gran, refresh]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const rangeOpts: { k: RangeKey; l: string }[] = [
    { k: "7",  l: "7 días" },
    { k: "30", l: "30 días" },
    { k: "90", l: "90 días" },
  ]
  const granOpts: { k: GranKey; l: string }[] = [
    { k: "day",   l: "Día" },
    { k: "week",  l: "Semana" },
    { k: "month", l: "Mes" },
  ]
  const tabs = [
    { k: "overview" as const, l: "Visión general" },
    { k: "sources"  as const, l: "Fuentes" },
    { k: "devices"  as const, l: "Dispositivos" },
    { k: "pages"    as const, l: "Páginas" },
    { k: "events"   as const, l: "Eventos" },
  ]

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <BarChart2 className="h-8 w-8 text-[#00f0ff] animate-pulse" />
        <p className="animate-pulse text-[#00f0ff] font-black text-sm tracking-widest">CARGANDO ANALÍTICAS...</p>
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="flex h-full items-center justify-center">
      <div className="glass-panel rounded-2xl p-8 text-center max-w-sm space-y-3">
        <AlertTriangle className="h-10 w-10 text-rose-400 mx-auto" />
        <p className="font-semibold text-foreground">Error al cargar analíticas</p>
        <p className="text-xs text-muted-foreground">{error}</p>
        <button onClick={() => setRefresh(r => r + 1)}
          className="rounded-lg bg-[#00f0ff]/10 text-[#00f0ff] text-sm px-4 py-2 hover:bg-[#00f0ff]/20 transition-colors">
          Reintentar
        </button>
      </div>
    </div>
  )

  if (!data.has_data) return <EmptyState />

  const { kpis } = data
  const anomalyCount = data.temporal.filter(p => p.anomalia).length

  // Fuentes con color
  const fuentesColors: Record<string, string> = {
    "Directo":  C.cyan,
    "Orgánico": C.green,
    "Social":   C.purple,
    "Referido": C.amber,
    "Pago":     C.pink,
  }

  const eventLabels: Record<string, string> = {
    cta_click:   "Clic CTA",
    scroll_depth:"Profundidad scroll",
    form_submit: "Envío formulario",
    download:    "Descarga",
    video_play:  "Video reproducido",
  }
  const eventColors: Record<string, string> = {
    cta_click:   C.cyan,
    scroll_depth:C.blue,
    form_submit: C.green,
    download:    C.amber,
    video_play:  C.purple,
  }
  const allEventTypes = [...new Set(data.eventos_tipo.map(e => e.name))]

  // Device icons
  const deviceIcons: Record<string, React.ElementType> = {
    Desktop: Monitor, Mobile: Smartphone, Tablet: Tablet,
    desktop: Monitor, mobile: Smartphone, tablet: Tablet,
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">

      {/* ── Header + filtros ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="neon-title text-2xl font-black tracking-tight">Analíticas · Avantservice</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tracking en tiempo real del sitio web
            {anomalyCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-400">
                <AlertTriangle className="h-3 w-3" />
                {anomalyCount} pico{anomalyCount > 1 ? "s" : ""} anómalo{anomalyCount > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Granularidad */}
          <div className="flex items-center gap-0.5 rounded-xl bg-white/[0.04] border border-white/[0.07] p-1">
            {granOpts.map(g => (
              <button key={g.k} onClick={() => setGran(g.k)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${gran === g.k ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}>
                {g.l}
              </button>
            ))}
          </div>
          {/* Rango */}
          <div className="flex items-center gap-0.5 rounded-xl bg-white/[0.04] border border-white/[0.07] p-1">
            {rangeOpts.map(r => (
              <button key={r.k} onClick={() => setRange(r.k)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${range === r.k ? "bg-[#00f0ff]/20 text-[#00f0ff]" : "text-muted-foreground hover:text-white"}`}>
                {r.l}
              </button>
            ))}
          </div>
          <button onClick={() => setRefresh(r => r + 1)}
            className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-2 text-muted-foreground hover:text-[#00f0ff] transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
        <KpiCard title="Visitas" value={kpis.visitas.curr.toLocaleString()}
          sub="páginas vistas" icon={Eye} color={C.cyan} kpi={kpis.visitas} />
        <KpiCard title="Usuarios únicos" value={kpis.usuarios.curr.toLocaleString()}
          sub="sesiones distintas" icon={Users} color={C.blue} kpi={kpis.usuarios} />
        <KpiCard title="Tasa de rebote" value={`${kpis.rebote.curr}%`}
          sub="1 sola página" icon={Zap} color={C.amber} kpi={kpis.rebote} inverse />
        <KpiCard title="Tiempo medio" value={fmtTime(kpis.tiempo_medio.curr)}
          sub="por página" icon={Clock} color={C.purple} kpi={kpis.tiempo_medio} />
        <KpiCard title="Págs/sesión" value={kpis.paginas_sesion.curr.toFixed(1)}
          sub="navegación media" icon={Layers} color={C.green} kpi={kpis.paginas_sesion} />
        <KpiCard title="Scroll medio" value={kpis.scroll_medio != null ? `${kpis.scroll_medio}%` : "—"}
          sub="profundidad de lectura" icon={Activity} color={C.pink} />
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-0.5 rounded-xl bg-white/[0.03] border border-white/[0.06] p-1 w-fit">
        {tabs.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
              tab === t.k
                ? "bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/20"
                : "text-muted-foreground hover:text-white"
            }`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ══ TAB: VISIÓN GENERAL ══════════════════════════════════════════════ */}
      {tab === "overview" && (
        <div className="space-y-6">

          {/* Tráfico temporal */}
          <Card className="glass-panel">
            <CardHeader>
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="neon-title">Tráfico en el tiempo</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-1">
                    Visitas y usuarios únicos · los puntos rojos son picos anómalos detectados
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  {[["Visitas", C.cyan], ["Usuarios", C.blue], ["Periodo ant.", "rgba(255,255,255,0.2)"]].map(([l, c]) => (
                    <div key={l as string} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="h-2 w-4 rounded-full inline-block" style={{ backgroundColor: c as string }} />
                      {l}
                    </div>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.temporal} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={C.cyan} stopOpacity={0.22} />
                        <stop offset="95%" stopColor={C.cyan} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gU" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={C.blue} stopOpacity={0.18} />
                        <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false}
                      tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                      interval={Math.max(0, Math.floor(data.temporal.length / 8) - 1)} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} />
                    <Tooltip {...tooltipStyle} />
                    <Area type="monotone" dataKey="visitas" stroke={C.cyan} strokeWidth={2.5}
                      fill="url(#gV)" name="Visitas" animationDuration={800}
                      dot={<AnomalyDot />} activeDot={{ r: 5, fill: C.cyan }} />
                    <Area type="monotone" dataKey="usuarios" stroke={C.blue} strokeWidth={2}
                      fill="url(#gU)" name="Usuarios" animationDuration={800} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Comparativa periodos */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="neon-title">Comparativa de periodos</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  Periodo actual vs periodo anterior (misma duración)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false}
                        tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                        interval={Math.max(0, Math.floor(data.temporal.length / 6) - 1)} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                      <Tooltip {...tooltipStyle} />
                      <Line data={data.temporal} type="monotone" dataKey="visitas"
                        stroke={C.cyan} strokeWidth={2.5} dot={false} name="Actual" />
                      <Line data={data.temporal_prev} type="monotone" dataKey="visitas"
                        stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} strokeDasharray="4 3"
                        dot={false} name="Anterior" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Scroll por página */}
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="neon-title">Profundidad de scroll</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  Porcentaje medio de página leída por sección
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.scroll_paginas.length === 0
                  ? <p className="text-sm text-muted-foreground text-center py-10">Sin datos aún</p>
                  : (
                    <div className="space-y-3 pt-1">
                      {data.scroll_paginas.map((p, i) => (
                        <div key={p.pagina} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{p.pagina}</span>
                            <span className="font-semibold text-foreground">{p.scroll}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${p.scroll}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                }
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ══ TAB: FUENTES ═════════════════════════════════════════════════════ */}
      {tab === "sources" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-7">

            {/* Donut fuentes */}
            <Card className="col-span-7 lg:col-span-3 glass-panel">
              <CardHeader>
                <CardTitle className="neon-title">Fuentes de tráfico</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  Clasificación por origen de visita + parámetros UTM
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.fuentes.length === 0
                  ? <p className="text-sm text-muted-foreground text-center py-12">Sin datos</p>
                  : (
                    <div className="flex gap-4 items-center">
                      <div className="h-[200px] w-[180px] shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={data.fuentes} cx="50%" cy="50%"
                              innerRadius={52} outerRadius={80} paddingAngle={3}
                              dataKey="value" animationDuration={700}>
                              {data.fuentes.map((f, i) => (
                                <Cell key={i} fill={fuentesColors[f.name] ?? PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
                              ))}
                            </Pie>
                            <Tooltip {...tooltipStyle} formatter={(v) => [v, "Sesiones"]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 space-y-2.5 min-w-0">
                        {(() => {
                          const total = data.fuentes.reduce((a, b) => a + b.value, 0)
                          return data.fuentes.map((f, i) => {
                            const color = fuentesColors[f.name] ?? PIE_COLORS[i % PIE_COLORS.length]
                            const pct = total > 0 ? Math.round(f.value / total * 100) : 0
                            return (
                              <div key={f.name} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                    <span className="text-muted-foreground">{f.name}</span>
                                  </div>
                                  <span className="font-semibold text-foreground">{f.value} <span className="text-muted-foreground/50">({pct}%)</span></span>
                                </div>
                                <div className="h-1 w-full rounded-full bg-white/[0.05] overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                                </div>
                              </div>
                            )
                          })
                        })()}
                      </div>
                    </div>
                  )
                }
              </CardContent>
            </Card>

            {/* Fuentes en el tiempo */}
            <Card className="col-span-7 lg:col-span-4 glass-panel">
              <CardHeader>
                <CardTitle className="neon-title">Fuentes en el tiempo</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  Evolución del origen de tráfico por {gran === "day" ? "día" : gran === "week" ? "semana" : "mes"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  {data.fuentes_tiempo.length === 0
                    ? <p className="text-sm text-muted-foreground text-center pt-16">Sin datos</p>
                    : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.fuentes_tiempo} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="label" axisLine={false} tickLine={false}
                            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                            interval={Math.max(0, Math.floor(data.fuentes_tiempo.length / 6) - 1)} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                          <Tooltip {...tooltipStyle} />
                          <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }} />
                          {Object.keys(fuentesColors).map(f => (
                            <Bar key={f} dataKey={f} stackId="a" fill={fuentesColors[f]}
                              name={f} maxBarSize={28} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    )
                  }
                </div>
              </CardContent>
            </Card>
          </div>

          {/* UTM campaigns */}
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="neon-title flex items-center gap-2">
                <Globe className="h-4 w-4" /> Campañas UTM activas
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Sesiones con parámetros UTM en la URL
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8 italic">
                Los datos UTM aparecerán cuando se usen enlaces con
                <span className="text-[#00f0ff]"> ?utm_source=…&utm_medium=…</span> en las campañas.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══ TAB: DISPOSITIVOS ════════════════════════════════════════════════ */}
      {tab === "devices" && (
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Dispositivos */}
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="neon-title">Tipo de dispositivo</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">Desktop / Mobile / Tablet</CardDescription>
            </CardHeader>
            <CardContent>
              {data.dispositivos.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-12">Sin datos</p>
                : (
                  <div className="space-y-4">
                    <div className="h-[160px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={data.dispositivos} cx="50%" cy="50%"
                            innerRadius={45} outerRadius={72} paddingAngle={3}
                            dataKey="value" animationDuration={700}>
                            {data.dispositivos.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i]} stroke="transparent" />
                            ))}
                          </Pie>
                          <Tooltip {...tooltipStyle} formatter={(v) => [v, "Sesiones"]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3">
                      {(() => {
                        const total = data.dispositivos.reduce((a, b) => a + b.value, 0)
                        return data.dispositivos.map((d, i) => {
                          const Icon = deviceIcons[d.name] ?? Monitor
                          const pct = total > 0 ? Math.round(d.value / total * 100) : 0
                          return (
                            <div key={d.name} className="flex items-center gap-3">
                              <Icon className="h-4 w-4 shrink-0" style={{ color: PIE_COLORS[i] }} />
                              <div className="flex-1 space-y-0.5">
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">{d.name}</span>
                                  <span className="font-semibold text-foreground">{pct}%</span>
                                </div>
                                <div className="h-1 w-full rounded-full bg-white/[0.05] overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[i] }} />
                                </div>
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </div>
                )
              }
            </CardContent>
          </Card>

          {/* Navegadores */}
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="neon-title">Navegadores</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">Distribución por navegador web</CardDescription>
            </CardHeader>
            <CardContent>
              {data.navegadores.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-12">Sin datos</p>
                : (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.navegadores} layout="vertical"
                        margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.04)" />
                        <XAxis type="number" axisLine={false} tickLine={false}
                          tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false}
                          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} width={55} />
                        <Tooltip {...tooltipStyle} formatter={(v) => [v, "Sesiones"]} />
                        <Bar dataKey="value" name="Sesiones" radius={[0, 5, 5, 0]} maxBarSize={16}>
                          {data.navegadores.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )
              }
            </CardContent>
          </Card>

          {/* Sistemas + Países */}
          <div className="space-y-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="neon-title">Sistemas operativos</CardTitle>
              </CardHeader>
              <CardContent>
                {data.sistemas.length === 0
                  ? <p className="text-sm text-muted-foreground text-center py-6">Sin datos</p>
                  : (
                    <div className="space-y-2.5">
                      {(() => {
                        const total = data.sistemas.reduce((a, b) => a + b.value, 0)
                        return data.sistemas.map((s, i) => {
                          const pct = total > 0 ? Math.round(s.value / total * 100) : 0
                          return (
                            <div key={s.name} className="space-y-0.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{s.name}</span>
                                <span className="font-semibold text-foreground">{pct}%</span>
                              </div>
                              <div className="h-1 w-full rounded-full bg-white/[0.05] overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  )
                }
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="neon-title flex items-center gap-1.5">
                  <Globe className="h-4 w-4" /> Países
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.paises.length === 0
                  ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Geo disponible con tráfico externo (no localhost)
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.paises.map((p, i) => {
                        const total = data.paises.reduce((a, b) => a + b.value, 0)
                        const pct = total > 0 ? Math.round(p.value / total * 100) : 0
                        return (
                          <div key={p.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                              <span className="text-muted-foreground">{p.name}</span>
                            </div>
                            <span className="font-semibold text-foreground">{p.value} <span className="text-muted-foreground/40">({pct}%)</span></span>
                          </div>
                        )
                      })}
                    </div>
                  )
                }
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ══ TAB: PÁGINAS ═════════════════════════════════════════════════════ */}
      {tab === "pages" && (
        <div className="space-y-6">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="neon-title">Rendimiento por página</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Comparativa con periodo anterior · ordenado por visitas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.paginas.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-12">Sin datos</p>
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          {["Página", "Visitas", "vs anterior", "Usuarios", "T. medio", "Scroll medio"].map(h => (
                            <th key={h} className="pb-3 text-left text-xs font-medium text-muted-foreground/50 pr-4 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.035]">
                        {data.paginas.map((p, i) => (
                          <tr key={p.pagina} className="hover:bg-white/[0.025] transition-colors">
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground/40 w-4">{i + 1}</span>
                                <span className="font-medium text-foreground text-xs">{p.pagina}</span>
                              </div>
                            </td>
                            <td className="py-3 pr-4 text-sm font-bold text-foreground">{p.visitas.toLocaleString()}</td>
                            <td className="py-3 pr-4">
                              {p.trend !== null ? (
                                <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  p.trend >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                                }`}>
                                  {p.trend >= 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                                  {p.trend > 0 ? "+" : ""}{p.trend}%
                                </div>
                              ) : <span className="text-xs text-muted-foreground/30">—</span>}
                            </td>
                            <td className="py-3 pr-4 text-xs text-foreground/70">{p.usuarios.toLocaleString()}</td>
                            <td className="py-3 pr-4 text-xs text-foreground/70">{fmtTime(p.tiempo_medio)}</td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-16 rounded-full bg-white/[0.06] overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${p.scroll_medio ?? 0}%`, backgroundColor: C.cyan }} />
                                </div>
                                <span className="text-xs text-muted-foreground">{p.scroll_medio != null ? `${p.scroll_medio}%` : "—"}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </CardContent>
          </Card>

          {/* Radar comparativo entre páginas */}
          {data.paginas.length >= 2 && (
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="neon-title">Análisis comparativo entre páginas</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  Visitas normalizadas por página
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={data.paginas.map(p => ({ name: p.pagina, visitas: p.visitas, usuarios: p.usuarios }))}>
                      <PolarGrid stroke="rgba(255,255,255,0.06)" />
                      <PolarAngleAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
                      <PolarRadiusAxis tick={false} axisLine={false} />
                      <Tooltip {...tooltipStyle} />
                      <Radar name="Visitas" dataKey="visitas" stroke={C.cyan}
                        fill={C.cyan} fillOpacity={0.1} strokeWidth={2} dot={{ r: 3, fill: C.cyan }} />
                      <Radar name="Usuarios" dataKey="usuarios" stroke={C.blue}
                        fill={C.blue} fillOpacity={0.1} strokeWidth={2} dot={{ r: 3, fill: C.blue }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ══ TAB: EVENTOS ═════════════════════════════════════════════════════ */}
      {tab === "events" && (
        <div className="space-y-6">

          {/* Totales por tipo */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { k: "cta_click",   l: "Clics CTA",   icon: MousePointerClick, color: C.cyan },
              { k: "scroll_depth",l: "Scroll",       icon: Activity,          color: C.blue },
              { k: "form_submit", l: "Formularios",  icon: Zap,               color: C.green },
              { k: "download",    l: "Descargas",    icon: Download,          color: C.amber },
              { k: "video_play",  l: "Vídeos",       icon: Eye,               color: C.purple },
            ].map(({ k, l, icon: Icon, color }) => {
              const found = data.eventos_tipo.find(e => e.name === k)
              return (
                <Card key={k} className="glass-panel group relative overflow-hidden hover:scale-[1.02] transition-all">
                  <CardContent className="pt-4 pb-4">
                    <div className="rounded-xl p-2 w-fit mb-2" style={{ backgroundColor: `${color}15` }}>
                      <Icon className="h-4 w-4" style={{ color }} />
                    </div>
                    <p className="text-xl font-bold text-foreground">{found?.value ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{l}</p>
                  </CardContent>
                  <div className="absolute bottom-0 left-0 h-[2px] w-0 transition-all duration-500 group-hover:w-full" style={{ backgroundColor: color }} />
                </Card>
              )
            })}
          </div>

          {/* Eventos en el tiempo */}
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="neon-title">Eventos en el tiempo</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Distribución de tipos de evento por {gran === "day" ? "día" : gran === "week" ? "semana" : "mes"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                {data.eventos_tiempo.length === 0
                  ? <p className="text-sm text-muted-foreground text-center pt-16">Sin eventos registrados aún</p>
                  : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.eventos_tiempo} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false}
                          tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                          interval={Math.max(0, Math.floor(data.eventos_tiempo.length / 6) - 1)} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                        <Tooltip {...tooltipStyle} formatter={(v, k) => [v, eventLabels[String(k)] ?? k]} />
                        <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }} formatter={(v) => eventLabels[v] ?? v} />
                        {allEventTypes.map(et => (
                          <Bar key={et} dataKey={et} stackId="a"
                            fill={eventColors[et] ?? PIE_COLORS[0]}
                            name={et} maxBarSize={28}
                            shape={<RoundBar />} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  )
                }
              </div>
            </CardContent>
          </Card>

          {/* Top eventos */}
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="neon-title">Top eventos por etiqueta</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Los elementos más clicados / interactuados del sitio
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.eventos_top.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-8">Sin eventos registrados aún</p>
                : (
                  <div className="space-y-2">
                    {data.eventos_top.map((e, i) => {
                      const color = eventColors[e.tipo] ?? PIE_COLORS[i % PIE_COLORS.length]
                      const maxVal = data.eventos_top[0]?.total ?? 1
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <div className="rounded-lg px-1.5 py-0.5 text-[10px] font-semibold shrink-0"
                            style={{ backgroundColor: `${color}15`, color }}>
                            {eventLabels[e.tipo] ?? e.tipo}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between text-xs mb-0.5">
                              <span className="text-muted-foreground truncate">{e.label || "(sin etiqueta)"}</span>
                              <span className="font-semibold text-foreground ml-2 shrink-0">{e.total}</span>
                            </div>
                            <div className="h-1 w-full rounded-full bg-white/[0.05] overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${(e.total / maxVal) * 100}%`, backgroundColor: color }} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              }
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  )
}
