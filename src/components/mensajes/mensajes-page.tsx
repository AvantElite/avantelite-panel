import { useState, useEffect } from "react"
import { Search, Mail, Reply, Trash2, Clock, CheckCircle2, User, Phone, Package, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import "../../avant-premium-theme.css"

// Definition aligned with database.sql
interface Contacto {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  producto: string;
  problema: string;
  mensaje: string;
  origen: string;
  fecha_creacion: string;
  leido: boolean;
}

// Eliminamos la variable global mockContactos porque ahora usaremos el estado del componente.

export function MensajesPage() {
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null)

  useEffect(() => {
    fetch("http://localhost/backendavant/get_contactos.php")
      .then(res => {
        if (!res.ok) throw new Error("Error en la conexión con el servidor")
        return res.json()
      })
      .then(data => {
        setContactos(data)
        if (data.length > 0) {
          setSelectedMessageId(data[0].id)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError("Incapaz de conectar con la base de datos (backend o MySQL offline).")
        setLoading(false)
      })
  }, [])

  const selectedMessage = contactos.find(m => m.id === selectedMessageId)

  // Function to open Gmail compose window directly
  const handleReplyGmail = (email: string, subject: string) => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent("Re: " + subject)}`;
    window.open(gmailUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 avant-premium-layout rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight neon-title">Mensajes de Clientes</h2>
          <p className="text-muted-foreground mt-1">
            Revisión técnica de los tickets y mensajes recibidos desde formulario.
          </p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden rounded-xl border bg-card shadow-sm glass-panel">

        {/* INBOX LIST (Left Sidebar) */}
        <div className="w-1/3 flex-shrink-0 flex flex-col border-r bg-background/50 sidebar-glass">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nombre o problema..."
                className="h-10 w-full rounded-md border border-input bg-transparent pl-9 pr-4 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-sm text-foreground animate-pulse font-medium">Conectando con base de datos real...</div>
            ) : error ? (
              <div className="p-8 text-center text-sm text-red-500 font-medium">{error}</div>
            ) : contactos.map((msg) => (
              <button
                key={msg.id}
                onClick={() => setSelectedMessageId(msg.id)}
                className={cn(
                  "w-full text-left p-4 border-b transition-colors hover:bg-muted/50 message-item",
                  selectedMessageId === msg.id && "active"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn("font-medium text-sm truncate pr-2", !msg.leido && "font-bold text-foreground")}>
                    {msg.nombre} {msg.apellido}
                  </span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(msg.fecha_creacion).toLocaleDateString()}
                  </span>
                </div>
                <div className={cn("text-xs truncate mb-1 text-primary", !msg.leido && "font-semibold")}>
                  {msg.problema}
                </div>
                <div className="text-xs text-muted-foreground truncate mb-1">
                  Producto: {msg.producto}
                </div>
                {!msg.leido && (
                  <div className="mt-2 flex h-2 w-2 rounded-full bg-primary" />
                )}
              </button>
            ))}
            {!loading && !error && contactos.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No hay ningún mensaje en la bandeja de entrada real.
              </div>
            )}
          </div>
        </div>

        {/* MESSAGE DETAIL (Right Panel - TICKET VIEW) */}
        <div className="flex-1 flex flex-col bg-card">
          {selectedMessage ? (
            <>
              {/* Message Header */}
              <div className="flex flex-col border-b">
                <div className="flex items-center justify-between p-6 pb-4 detail-header">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-6 w-6" />
                    </div>
                    <div className="flex flex-col justify-center">
                      <h3 className="text-lg font-semibold tracking-tight">{selectedMessage.nombre} {selectedMessage.apellido}</h3>
                      <button
                        onClick={() => handleReplyGmail(selectedMessage.email, selectedMessage.problema)}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors text-left flex items-center gap-1 group"
                        title="Hacer clic para enviar correo usando Gmail"
                      >
                        <Mail className="h-3 w-3 opacity-70 group-hover:opacity-100" />
                        {selectedMessage.email}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <button className="p-2 hover:bg-accent hover:text-foreground rounded-md transition-colors" title="Marcar como Completado">
                      <CheckCircle2 className="h-5 w-5" />
                    </button>
                    <button className="p-2 hover:bg-accent hover:text-destructive rounded-md transition-colors" title="Eliminar Mensaje">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="px-6 py-3 bg-muted/30 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-b detail-stats">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span className="font-medium text-foreground">{selectedMessage.telefono || "No especificado"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span className="font-medium text-foreground truncate">{selectedMessage.producto}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Tag className="h-4 w-4" />
                    <span className="font-medium text-foreground">{selectedMessage.origen}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium text-foreground">{new Date(selectedMessage.fecha_creacion).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Message Content */}
              <div className="flex-1 p-8 overflow-y-auto">
                <div className="mb-6">
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1 border-b pb-2">Asunto / Problema</h4>
                  <h2 className="text-xl font-bold mt-3 text-primary">{selectedMessage.problema}</h2>
                </div>

                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap leading-relaxed text-foreground/90 font-medium bg-background p-6 rounded-lg border border-border/50 shadow-inner message-content-box">
                    "{selectedMessage.mensaje}"
                  </p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-6 border-t bg-background/30 rounded-br-xl">
                <button
                  onClick={() => handleReplyGmail(selectedMessage.email, selectedMessage.problema)}
                  className="flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-white shadow-lg btn-premium"
                >
                  <Reply className="h-4 w-4" />
                  Responder con Gmail
                </button>
                <p className="mt-3 text-xs text-muted-foreground">
                  Al hacer clic se abrirá una nueva pestaña de Gmail con el destinatario listo.
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <Mail className="h-16 w-16 mb-4 opacity-20" />
              <p>Selecciona un mensaje para leerlo</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
