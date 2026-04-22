import {
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  BarChart2,
  History,
  LogOut,
  UserCircle,
  Users,
  Brain,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { AuthUser } from "@/components/auth/login-page"

const ALL_NAV = [
  { name: "Dashboard",  icon: LayoutDashboard },
  { name: "Mensajes",   icon: MessageSquare   },
  { name: "Historial",  icon: History         },
  { name: "Blog",       icon: BookOpen        },
  { name: "Analíticas", icon: BarChart2       },
  { name: "Usuarios",   icon: Users           },
  { name: "RAG",        icon: Brain           },
]

interface SidebarProps {
  currentView: string
  onNavigate: (view: string) => void
  user: AuthUser
  onLogout: () => void
}

export function Sidebar({ currentView, onNavigate, user, onLogout }: SidebarProps) {
  const navigation = ALL_NAV.filter(item => (user.permisos ?? []).includes(item.name))

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col sidebar-glass">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <img src="/src/assets/logo.svg" alt="Avantservice Logo" className="h-8 w-8" />
        <span className="text-lg font-semibold text-foreground"><span className="neon-title">Avant</span>Panel</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = currentView === item.name
          return (
            <button
              key={item.name}
              onClick={() => onNavigate(item.name)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors message-item",
                isActive
                  ? "active"
                  : "text-muted-foreground hover:bg-accent/10 hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-white/5 p-3 space-y-1">
        <div className="flex items-center gap-2 px-3 py-2">
          <UserCircle className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user.nombre}</p>
            <p className="text-xs text-muted-foreground capitalize">{user.rol}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}
