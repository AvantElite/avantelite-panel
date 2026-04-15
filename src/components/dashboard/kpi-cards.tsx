import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Users, AlertCircle, MessageSquare, CheckCircle } from "lucide-react"
import { LineChart, Line, ResponsiveContainer } from "recharts"

export function KpiCards({ total = 0, nuevos = 0, leidos = 0 }: { total?: number; nuevos?: number; leidos?: number }) {
  const percentageLeidos = total > 0 ? Math.round((leidos / total) * 100) : 0;

  const kpis = [
    {
      title: "Mensajes Totales",
      value: total.toLocaleString(),
      change: "+12.5%",
      trend: "up" as const,
      icon: MessageSquare,
      color: "#00f0ff",
      data: [{ v: 30 }, { v: 40 }, { v: 35 }, { v: 50 }, { v: 45 }, { v: 60 }, { v: 55 }]
    },
    {
      title: "Nuevos Contactos",
      value: nuevos.toLocaleString(),
      change: "+8.2%",
      trend: "up" as const,
      icon: Users,
      color: "#0057ff",
      data: [{ v: 20 }, { v: 25 }, { v: 22 }, { v: 30 }, { v: 28 }, { v: 35 }, { v: 32 }]
    },
    {
      title: "Tiempo de Respuesta",
      value: "1.2h",
      change: "-15%",
      trend: "down" as const,
      icon: AlertCircle,
      color: "#ec4899",
      data: [{ v: 50 }, { v: 45 }, { v: 48 }, { v: 40 }, { v: 42 }, { v: 35 }, { v: 38 }]
    },
    {
      title: "Casos Leídos",
      value: `${percentageLeidos}%`,
      change: "+2.4%",
      trend: "up" as const,
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
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={kpi.trend === "up" ? "text-emerald-500" : "text-rose-500"}>
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
