// Configuración centralizada de endpoints
// Los valores se inyectan según el entorno (.env.local / .env.production)
export const API_DESPACHOS = import.meta.env?.VITE_API_DESPACHOS ?? 'http://localhost/api/v1/despachos'
export const API_VENTAS    = import.meta.env?.VITE_API_VENTAS    ?? 'http://localhost/api/v1/ventas'