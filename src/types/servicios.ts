export const TIPOS_PROBLEMA = [
  "fallo-electrico",
  "fallo-mecanico",
  "fallo-software",
  "no-enciende",
  "no-enfria",
  "no-calienta",
  "fuga-agua",
  "ruido-anomalo",
  "pantalla-rota",
  "problemas-imagen",
  "problemas-sonido",
  "otros",
] as const

export type TipoProblema = typeof TIPOS_PROBLEMA[number]
