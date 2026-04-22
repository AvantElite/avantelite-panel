import { useState, useEffect } from "react"
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
import "./avant-premium-theme.css"

const API_URL = "http://localhost/backendavant/api.php?r=contactos/stats"

function App() {
  const [currentView, setCurrentView] = useState("Dashboard")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Auth
  const [user, setUser]           = useState<AuthUser | null>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    const token  = localStorage.getItem("avant_token")
    const stored = localStorage.getItem("avant_user")
    if (token && stored) {
      fetch("http://localhost/backendavant/api.php?r=auth/me", {
        headers: { "X-Token": token }
      })
        .then(r => r.json())
        .then(d => {
          if (d.user) {
            setUser(d.user)
            if (!d.user.permisos?.includes("Dashboard")) setCurrentView("Mensajes")
          } else {
            localStorage.removeItem("avant_token")
            localStorage.removeItem("avant_user")
          }
        })
        .catch(() => {
          try {
            const u = JSON.parse(stored)
            if (!u.permisos) {
              u.permisos = u.rol === "administrador"
                ? ["Dashboard","Mensajes","Historial","Blog","Analíticas","Usuarios","RAG"]
                : ["Mensajes","Historial"]
            }
            setUser(u)
          } catch { /* noop */ }
        })
        .finally(() => setAuthReady(true))
    } else {
      setAuthReady(true)
    }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(API_URL)
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

  const handleLogin = (_token: string, u: AuthUser) => {
    setUser(u)
    if (!u.permisos?.includes("Dashboard")) setCurrentView("Mensajes")
    else setCurrentView("Dashboard")
  }

  const handleLogout = () => {
    const token = localStorage.getItem("avant_token")
    if (token) {
      fetch("http://localhost/backendavant/api.php?r=auth/logout", {
        method: "POST",
        headers: { "X-Token": token },
      }).catch(() => {})
    }
    localStorage.removeItem("avant_token")
    localStorage.removeItem("avant_user")
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
          {currentView === "Mensajes" && <MensajesPage />}
          {currentView === "Historial" && <HistorialPage />}
          {currentView === "Blog" && <BlogPage />}
          {currentView === "Analíticas" && <AnalyticsPage />}
          {currentView === "Usuarios" && <UsuariosPage />}
          {currentView === "RAG" && <RagPage />}
          {currentView !== "Dashboard" && currentView !== "Mensajes" && currentView !== "Historial" && currentView !== "Blog" && currentView !== "Analíticas" && currentView !== "Usuarios" && currentView !== "RAG" && (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p>La vista "{currentView}" está en desarrollo.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
