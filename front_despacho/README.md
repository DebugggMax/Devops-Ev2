# 🖥️ Frontend — React + Vite

Aplicación frontend del sistema de gestión de despachos de **Innovatech Chile**, construida con React 18 y Vite 5. Sirve como interfaz de usuario para la gestión de órdenes de compra y despachos.

---

## Arquitectura

```
front_despacho/
├── src/
│   ├── componentes/
│   │   └── CrudAdmin/
│   │       ├── FormCierreDespacho.jsx
│   │       ├── FormDespacho.jsx
│   │       ├── TableCompras.jsx
│   │       └── TableDespachos.jsx
│   ├── config/
│   │   └── api.js          ← URLs centralizadas
│   └── main.jsx
├── .env.local               ← Variables entorno local (no subir a git)
├── .env.production          ← Variables entorno AWS (no subir a git)
├── .env.example             ← Plantilla documentada
├── Dockerfile               ← Multi-stage build
└── package.json
```

---

## Dockerfile — Multi-stage Build

```dockerfile
# ETAPA 1: Compilar (node:18-alpine)
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_DESPACHOS
ARG VITE_API_VENTAS
ENV VITE_API_DESPACHOS=$VITE_API_DESPACHOS
ENV VITE_API_VENTAS=$VITE_API_VENTAS
RUN npm run build

# ETAPA 2: Servir (nginx-unprivileged = usuario NO ROOT)
FROM nginxinc/nginx-unprivileged:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

**¿Por qué multi-stage?**
- La imagen final pasa de ~800MB (node) a ~50MB (nginx-alpine)
- El usuario no root cumple el principio de mínimo privilegio
- Las dependencias de compilación no llegan a producción

---

## Variables de Entorno

| Variable | Descripción | Ejemplo Local | Ejemplo AWS |
|---|---|---|---|
| `VITE_API_DESPACHOS` | URL base API despachos | `http://localhost/api/v1/despachos` | `http://3.92.157.252/api/v1/despachos` |
| `VITE_API_VENTAS` | URL base API ventas | `http://localhost/api/v1/ventas` | `http://3.92.157.252/api/v1/ventas` |

Copia `.env.example` y renómbralo según el entorno:

```bash
cp .env.example .env.local       # Para desarrollo local
cp .env.example .env.production  # Para AWS (completar con IP pública)
```

Las variables se inyectan en **tiempo de build** por Vite. En Docker Compose se pasan como `args`.

---

## Ejecución Local

### Con Docker Compose (recomendado)

```bash
# Desde la raíz del monorepo
docker compose up --build
```

El frontend estará disponible en: `http://localhost`

### Sin Docker (desarrollo)

```bash
cd front_despacho
npm install
npm run dev
```

Disponible en: `http://localhost:5173`

---

## Endpoints consumidos

| Método | Endpoint | Componente |
|---|---|---|
| GET | `/api/v1/ventas` | `TableCompras.jsx` |
| PUT | `/api/v1/ventas/:id` | `FormDespacho.jsx` |
| GET | `/api/v1/despachos` | `TableDespachos.jsx` |
| POST | `/api/v1/despachos` | `FormDespacho.jsx` |
| PUT | `/api/v1/despachos/:id` | `FormCierreDespacho.jsx` |

---

## Dependencias principales

| Paquete | Versión | Uso |
|---|---|---|
| react | ^18.2.0 | Framework UI |
| react-router-dom | ^6.24.1 | Ruteo SPA |
| axios | ^1.6.8 | Llamadas HTTP |
| react-hook-form | ^7.52.1 | Formularios |
| sweetalert2 | ^11.11.0 | Alertas |
| tailwindcss | ^3.4.3 | Estilos |
| vite | ^5.2.0 | Bundler |

---

## Pipeline CI/CD

El workflow `.github/workflows/deploy-frontend.yml` se dispara cuando hay un push a la rama `deploy` con cambios en `front_despacho/**`.

**Flujo:**
1. Build imagen con `VITE_*` desde GitHub Secrets
2. Push a `ghcr.io/debugggmax/frontend-despacho:latest`
3. SSH a EC2 → `docker compose pull frontend` → `docker compose up -d --no-deps frontend`

**Secrets requeridos:**
- `VITE_API_DESPACHOS`
- `VITE_API_VENTAS`
- `EC2_FRONTEND_HOST`
- `EC2_USER`
- `EC2_SSH_KEY`
- `CR_PAT`
