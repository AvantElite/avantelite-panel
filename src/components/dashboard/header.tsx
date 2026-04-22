import { Search } from "lucide-react"
import type { AuthUser } from "@/components/auth/login-page"

interface HeaderProps {
  user: AuthUser
}

export function Header({ user }: HeaderProps) {
  const initials = user.nombre
    .split(" ")
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <header className="sticky top-0 z-50 flex h-20 items-center justify-between detail-header px-8">
      <div className="flex flex-col gap-0.5">
        <h1
          className="neon-title text-2xl font-black tracking-tight transition-all hover:scale-[1.01]"
        >
          PANEL DE CONTROL
        </h1>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/80">
            SISTEMA ACTIVO • {user.rol.toUpperCase()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="group relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-[#00f0ff]" />
          <input
            type="text"
            placeholder="Buscar en el panel..."
            className="h-10 w-72 rounded-xl border border-border/50 pl-10 pr-4 text-sm outline-none transition-all message-content-box focus:border-[#00f0ff] focus:ring-4 focus:ring-[#00f0ff]/20"
          />
        </div>

        <div className="flex items-center gap-3 border-l border-white/10 pl-6">
          <div className="flex flex-col items-end">
            <p className="text-xs font-bold text-foreground">{user.nombre}</p>
            <p className="text-[10px] text-emerald-400 font-medium">Online</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#0057ff] to-[#00f0ff] p-[1px]">
            <div className="flex h-full w-full items-center justify-center rounded-[11px] bg-[#0B0F19]">
              <span className="text-sm font-black text-[#00f0ff]">{initials}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
