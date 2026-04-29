export const API_BASE = import.meta.env.VITE_API_URL as string

export const api = (route: string) => `${API_BASE}/api/${route}`

function getCsrfToken(): string {
  return document.cookie
    .split("; ")
    .find(row => row.startsWith("av_csrf="))
    ?.split("=")[1] ?? ""
}

/** Drop-in replacement para fetch() que envía la cookie httpOnly y el token CSRF. */
export function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase()
  const safeMethods = new Set(["GET", "HEAD", "OPTIONS"])

  const headers = new Headers(init.headers)
  if (!safeMethods.has(method)) {
    const csrf = getCsrfToken()
    if (csrf) headers.set("X-CSRF-Token", csrf)
  }

  return fetch(input, { ...init, headers, credentials: "include" })
}
