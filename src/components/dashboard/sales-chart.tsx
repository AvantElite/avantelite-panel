import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

export function SalesChart({ data = [] }: { data?: any[] }) {
  const totalContactos = data.reduce((acc, curr) => acc + curr.contactos, 0);

  return (
    <Card className="col-span-3 glass-panel">
      <CardHeader>
        <CardTitle className="neon-title">Contactos Semanales</CardTitle>
        <CardDescription className="text-foreground/80 font-bold text-xl">
          {totalContactos} Consultas
        </CardDescription>
        <p className="text-xs text-muted-foreground">Distribución diaria en los últimos 7 días</p>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.length > 0 ? data : []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00f0ff" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#0057ff" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="dia" 
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
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "12px",
                  backdropFilter: "blur(12px)",
                  fontSize: "12px",
                }}
                itemStyle={{ color: "#fff" }}
              />
              <Bar
                dataKey="contactos"
                fill="url(#colorBar)"
                radius={[6, 6, 0, 0]}
                name="Mensajes"
                animationDuration={1500}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
