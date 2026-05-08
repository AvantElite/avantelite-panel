import { useState, useEffect } from "react"
import { api, authFetch, setCsrfToken } from "@/lib/api"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { SalesChart } from "@/components/dashboard/sales-chart"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { ProductDistribution } from "@/components/dashboard/product-distribution"
import { MensajesPage } from "@/components/mensajes/mensajes-page"
import { HistorialPage } from "@/components/historial/historial-page"
import { BlogPage } from "@/components/blog/blog-page"
import { AnalyticsPage } from "@/components/analytics/analytics-page"
import { LoginPage, type AuthUser } from "@/components/auth/login-page"
import { UsuariosPage } from "@/components/usuarios/usuarios-page"
import { RagPage } from "@/components/rag/rag-page"
import { ServiciosPage } from "@/components/servicios/servicios-page"
import { Brain } from "lucide-react"
import "./avant-premium-theme.css"

const API_URL = api("contactos/stats")

export type RagToast = { state: "loading" } | { state: "done"; count: number } | null

function App() {
  const [currentView, setCurrentView] = useState("Dashboard")
  const [ragOpenId, setRagOpenId] = useState<number | null>(null)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [ragToast, setRagToast] = useState<RagToast>(null)

  const handleNavigateToRag = (id: number) => {
    setRagOpenId(id)
    setCurrentView("Contexto IA")
  }

  useEffect(() => {
    if (ragToast?.state === "done") {
      const t = setTimeout(() => setRagToast(null), 6000)
      return () => clearTimeout(t)
    }
  }, [ragToast])

  // Auth
  const [user, setUser]           = useState<AuthUser | null>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    if (localStorage.getItem("logged_out") === "1") {
      setAuthReady(true)
      return
    }
    fetch(api("auth/me"), { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          if (d.csrfToken) setCsrfToken(d.csrfToken)
          if (Array.isArray(d.user.permisos)) {
            d.user.permisos = d.user.permisos.map((p: string) => p === "RAG" ? "Contexto IA" : p)
          }
          setUser(d.user)
          const permisos = d.user.permisos ?? []
          setCurrentView(permisos[0] ?? "")
        }
      })
      .catch(() => {})
      .finally(() => setAuthReady(true))
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await authFetch(API_URL)
        const json = await response.json()
        setData(json)
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }
    if (currentView === "Dashboard") {
      fetchData()
    }
  }, [currentView])

  const handleLogin = (u: AuthUser) => {
    localStorage.removeItem("logged_out")
    setUser(u)
    setCurrentView(u.permisos?.[0] ?? "")
  }

  const handleLogout = async () => {
    try { await fetch(api("auth/logout"), { method: "POST", credentials: "include" }) } catch {}
    setCsrfToken("")
    localStorage.setItem("logged_out", "1")
    setUser(null)
  }

  if (!authReady) {
    return (
      <div className="flex h-screen items-center justify-center avant-premium-layout">
        <div className="animate-pulse text-[#00f0ff] font-black text-xl tracking-widest">CARGANDO…</div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <div className="flex h-screen overflow-hidden avant-premium-layout p-0 rounded-none">
      <Sidebar currentView={currentView} onNavigate={setCurrentView} user={user} onLogout={handleLogout} />
      <div className="flex flex-1 flex-col overflow-auto">
        <Header user={user} />
        {/* Toast global Contexto IA */}
        {ragToast && (
          <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl border shadow-2xl text-sm font-medium transition-all duration-300 ${ragToast.state === "loading" ? "bg-violet-950 border-violet-500/50 text-violet-200" : ragToast.count > 0 ? "bg-emerald-950 border-emerald-500/50 text-emerald-200" : "bg-zinc-900 border-zinc-700 text-zinc-300"}`}>
            <Brain className={`h-4 w-4 shrink-0 ${ragToast.state === "loading" ? "animate-spin" : ragToast.state === "done" && ragToast.count > 0 ? "text-emerald-400" : "text-zinc-400"}`} />
            {ragToast.state === "loading"
              ? "Analizando conversación para Contexto IA…"
              : ragToast.count > 0
                ? `✓ ${ragToast.count} entrada${ragToast.count !== 1 ? "s" : ""} guardada${ragToast.count !== 1 ? "s" : ""} en Contexto IA`
                : "Sin información nueva para Contexto IA"}
          </div>
        )}
        <main className="flex-1 p-6 lg:p-10">
          {loading && currentView === "Dashboard" ? (
            <div className="flex h-full items-center justify-center">
              <div className="animate-pulse text-[#00f0ff] font-black text-xl tracking-widest">CARGANDO SISTEMA...</div>
            </div>
          ) : (
            currentView === "Dashboard" && data && (
              <div className="mx-auto max-w-7xl space-y-8">
                <section>
                  <KpiCards
                    total={data.total_contactos}
                    nuevos={data.nuevos_contactos}
                    leidos={data.leidos_contactos}
                    tiempoRespuesta={data.tiempo_respuesta}
                    pctTotal={data.pct_total}
                    pctNuevos={data.pct_nuevos}
                    pctLeidos={data.pct_leidos}
                    pctTiempo={data.pct_tiempo}
                  />
                </section>

                <section className="grid gap-8 lg:grid-cols-7">
                  <div className="col-span-7 lg:col-span-4">
                    <RevenueChart data={data.volumen_mensual} />
                  </div>
                  <div className="col-span-7 lg:col-span-3">
                    <SalesChart data={data.contactos_diarios} />
                  </div>
                </section>

                <section className="grid gap-8 lg:grid-cols-7">
                  <div className="col-span-7 lg:col-span-3">
                    <ProductDistribution data={data.distribucion_producto} />
                  </div>
                  <div className="col-span-7 lg:col-span-4">
                    <RecentActivity data={data.actividad_reciente} />
                  </div>
                </section>
              </div>
            )
          )}
          {currentView === "Mensajes" && <MensajesPage onRagToast={setRagToast} onNavigateToRag={handleNavigateToRag} />}
          {currentView === "Historial" && <HistorialPage />}
          {currentView === "Blog" && <BlogPage />}
          {currentView === "Analíticas" && <AnalyticsPage />}
          {currentView === "Usuarios" && <UsuariosPage />}
          {currentView === "Contexto IA" && <RagPage initialId={ragOpenId} onOpen={() => setRagOpenId(null)} />}
          {currentView === "Servicios" && <ServiciosPage />}
          {currentView !== "Dashboard" && currentView !== "Mensajes" && currentView !== "Historial" && currentView !== "Blog" && currentView !== "Analíticas" && currentView !== "Usuarios" && currentView !== "Contexto IA" && currentView !== "Servicios" && (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p>{currentView === "" ? "No tienes permisos para acceder a este panel." : `La vista "${currentView}" está en desarrollo.`}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
