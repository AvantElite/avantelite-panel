import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Users, AlertCircle, MessageSquare, CheckCircle } from "lucide-react"
import { LineChart, Line, ResponsiveContainer } from "recharts"

function fmtPct(val: number | null | undefined, invert = false): { label: string; trend: "up" | "down" | "neutral" } {
  if (val === null || val === undefined) return { label: "—", trend: "neutral" }
  const sign = val >= 0 ? "+" : ""
  const trend = invert ? (val <= 0 ? "up" : "down") : (val >= 0 ? "up" : "down")
  return { label: `${sign}${val}%`, trend }
}

export function KpiCards({ total = 0, nuevos = 0, leidos = 0, tiempoRespuesta, pctTotal, pctNuevos, pctLeidos, pctTiempo }: {
  total?: number; nuevos?: number; leidos?: number; tiempoRespuesta?: string | null
  pctTotal?: number | null; pctNuevos?: number | null; pctLeidos?: number | null; pctTiempo?: number | null
}) {
  const percentageLeidos = total > 0 ? Math.round((leidos / total) * 100) : 0;

  const p0 = fmtPct(pctTotal)
  const p1 = fmtPct(pctNuevos)
  const p2 = fmtPct(pctTiempo, true)
  const p3 = fmtPct(pctLeidos)

  const kpis = [
    {
      title: "Mensajes Totales",
      value: total.toLocaleString(),
      change: p0.label,
      trend: p0.trend,
      icon: MessageSquare,
      color: "#00f0ff",
      data: [{ v: 30 }, { v: 40 }, { v: 35 }, { v: 50 }, { v: 45 }, { v: 60 }, { v: 55 }]
    },
    {
      title: "Nuevos Contactos",
      value: nuevos.toLocaleString(),
      change: p1.label,
      trend: p1.trend,
      icon: Users,
      color: "#0057ff",
      data: [{ v: 20 }, { v: 25 }, { v: 22 }, { v: 30 }, { v: 28 }, { v: 35 }, { v: 32 }]
    },
    {
      title: "Tiempo de Respuesta",
      value: tiempoRespuesta ?? "—",
      change: p2.label,
      trend: p2.trend,
      icon: AlertCircle,
      color: "#ec4899",
      data: [{ v: 50 }, { v: 45 }, { v: 48 }, { v: 40 }, { v: 42 }, { v: 35 }, { v: 38 }]
    },
    {
      title: "Casos Leídos",
      value: `${percentageLeidos}%`,
      change: p3.label,
      trend: p3.trend,
      icon: CheckCircle,
      color: "#10b981",
      data: [{ v: 80 }, { v: 82 }, { v: 85 }, { v: 83 }, { v: 88 }, { v: 90 }, { v: 92 }]
    },
  ]

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title} className="glass-panel group overflow-hidden transition-all hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
            <div className="rounded-full p-2 transition-colors" style={{ backgroundColor: `${kpi.color}10` }}>
              <kpi.icon className="h-4 w-4" style={{ color: kpi.color }} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold tracking-tight text-foreground">{kpi.value}</div>
                <p className="mt-1 flex items-center gap-1 text-xs">
                  {kpi.trend === "up" ? (
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                  ) : kpi.trend === "down" ? (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  ) : null}
                  <span className={kpi.trend === "up" ? "text-emerald-500" : kpi.trend === "down" ? "text-rose-500" : "text-muted-foreground"}>
                    {kpi.change}
                  </span>{" "}
                  <span className="text-muted-foreground/60">vs mes anterior</span>
                </p>
              </div>
              <div className="h-10 w-24 opacity-50 group-hover:opacity-100 transition-opacity">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={kpi.data}>
                    <Line
                      type="monotone"
                      dataKey="v"
                      stroke={kpi.color}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
          <div
            className="absolute bottom-0 left-0 h-[2px] w-0 transition-all duration-500 group-hover:w-full"
            style={{ backgroundColor: kpi.color }}
          />
        </Card>
      ))}
    </div>
  )
}
