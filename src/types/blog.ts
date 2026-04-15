export type CategoriaEnum = "Electrodomésticos" | "Televisores" | "Calderas" | "General"

export const CATEGORIAS: CategoriaEnum[] = [
  "Electrodomésticos",
  "Televisores",
  "Calderas",
  "General",
]

export interface BlogPost {
  id: number
  titulo: string
  slug: string
  categoria: CategoriaEnum
  resumen: string
  contenido: string
  emoji: string
  destacado: boolean
  publicado: boolean
  fecha: string        // DATE — "YYYY-MM-DD"
  creado_en: string    // DATETIME
  actualizado: string  // DATETIME
}

export type BlogPostDraft = Omit<BlogPost, "id" | "creado_en" | "actualizado">
