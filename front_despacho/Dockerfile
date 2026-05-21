# ETAPA 1: Compilar la aplicación (Multi-stage)
FROM node:18-alpine AS builder
WORKDIR /app

# 1. Copiamos e instalamos dependencias primero (Para aprovechar la caché de Docker)
COPY package*.json ./
RUN npm install

# 2. DECLARAR LOS ARGS Y ENVS ANTES DE COPIAR EL CÓDIGO Y COMPILAR
ARG VITE_API_DESPACHOS
ARG VITE_API_VENTAS

ENV VITE_API_DESPACHOS=$VITE_API_DESPACHOS
ENV VITE_API_VENTAS=$VITE_API_VENTAS

# 3. Ahora sí, copiamos el resto del código fuente
COPY . .

# 4. Compilar (Vite detectará las variables de entorno perfectamente)
RUN npm run build

# ETAPA 2: Servir con Nginx Seguro (Mínimo Privilegio / No-Root)
FROM nginxinc/nginx-unprivileged:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]