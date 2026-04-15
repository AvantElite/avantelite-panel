import { useState, useEffect } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { SalesChart } from "@/components/dashboard/sales-chart"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { ProductDistribution } from "@/components/dashboard/product-distribution"
import { MensajesPage } from "@/components/mensajes/mensajes-page"
import { BlogPage } from "@/components/blog/blog-page"
import { AnalyticsPage } from "@/components/analytics/analytics-page"
import "./avant-premium-theme.css"

const API_URL = "http://localhost/backendavant/get_stats.php"

function App() {
  const [currentView, setCurrentView] = useState("Dashboard")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="flex h-screen overflow-hidden avant-premium-layout p-0 rounded-none">
      <Sidebar currentView={currentView} onNavigate={setCurrentView} />
      <div className="flex flex-1 flex-col overflow-auto">
        <Header />
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
          {currentView === "Blog" && <BlogPage />}
          {currentView === "Analíticas" && <AnalyticsPage />}
          {currentView !== "Dashboard" && currentView !== "Mensajes" && currentView !== "Blog" && currentView !== "Analíticas" && (
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
