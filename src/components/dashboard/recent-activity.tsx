import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"

const STATUS_COLORS: Record<string, string> = {
  "Nuevo": "#00f0ff",
  "Urgente": "#ff4d4d",
  "En Proceso": "#0057ff",
  "Leído": "#10b981"
}

const DIFICULTAD_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  facil:   { color: "#34d399", bg: "#10b98115", label: "Fácil" },
  medio:   { color: "#fbbf24", bg: "#f59e0b15", label: "Medio" },
  dificil: { color: "#fb7185", bg: "#f43f5e15", label: "Difícil" },
}

export function RecentActivity({ data = [] }: { data?: any[] }) {
  return (
    <Card className="col-span-3 glass-panel">
      <CardHeader>
        <CardTitle className="neon-title text-lg font-bold">Actividad Reciente</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 max-h-[340px] overflow-y-auto pr-1">
          {data.map((activity, i) => {
            const statusColor = STATUS_COLORS[activity.status] || "#94a3b8"
            return (
              <div key={i} className="group relative flex items-center gap-4 rounded-xl p-2 transition-all hover:bg-white/5">
                <Avatar name={activity.name} className="h-10 w-10 ring-2 ring-white/5" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-foreground">{activity.name}</p>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {new Date(activity.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-foreground/80">{activity.action}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] font-bold text-muted-foreground px-2 py-0.5 rounded-full bg-white/5">
                      {activity.producto}
                    </span>
                    <span
                      className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
                    >
                      {activity.status}
                    </span>
                    {activity.tipo === "diy" && activity.dificultad && (() => {
                      const d = DIFICULTAD_COLORS[activity.dificultad]
                      return d ? (
                        <span
                          className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: d.bg, color: d.color }}
                        >
                          {d.label}
                        </span>
                      ) : null
                    })()}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
