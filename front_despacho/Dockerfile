# ETAPA 1: Compilar la aplicación (Multi-stage)
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ETAPA 2: Servir con Nginx Seguro (Mínimo Privilegio / No-Root)
FROM nginxinc/nginx-unprivileged:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponemos el puerto 8080 (No requiere permisos de Root)
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]