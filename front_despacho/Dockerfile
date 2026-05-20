# ETAPA 1: Compilar la aplicación (Multi-stage)
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Declarar los ARGs que vienen del docker-compose
ARG VITE_API_DESPACHOS
ARG VITE_API_VENTAS

# Vite los necesita como ENV para el build
ENV VITE_API_DESPACHOS=$VITE_API_DESPACHOS
ENV VITE_API_VENTAS=$VITE_API_VENTAS

RUN npm run build

# ETAPA 2: Servir con Nginx Seguro (Mínimo Privilegio / No-Root)
FROM nginxinc/nginx-unprivileged:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]