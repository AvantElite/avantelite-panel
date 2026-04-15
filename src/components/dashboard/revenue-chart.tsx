import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

export function RevenueChart({ data = [] }: { data?: any[] }) {
  return (
    <Card className="col-span-4 glass-panel">
      <CardHeader>
        <CardTitle className="neon-title">Volumen de Mensajes</CardTitle>
        <CardDescription className="text-foreground/80 font-bold text-xl">
          {data.reduce((acc, curr) => acc + curr.recibidos, 0).toLocaleString()} Mensajes Anuales
        </CardDescription>
        <p className="text-xs text-muted-foreground">Comparativa de mensajes recibidos vs leídos por mes</p>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.length > 0 ? data : []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRecibidos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00f0ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorLeidos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0057ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0057ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="mes" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} 
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "12px",
                  backdropFilter: "blur(12px)",
                  fontSize: "12px",
                }}
                itemStyle={{ color: "#fff" }}
              />
              <Area
                type="monotone"
                dataKey="recibidos"
                stroke="#00f0ff"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorRecibidos)"
                name="Recibidos"
                animationDuration={1500}
              />
              <Area
                type="monotone"
                dataKey="leidos"
                stroke="#0057ff"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorLeidos)"
                name="Leídos"
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
