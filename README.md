# DevOps EP2 — Monorepo Dockerizado + CI/CD + AWS

Sistema de gestión de despachos para **Innovatech Chile**, compuesto por 3 microservicios completamente dockerizados, orquestados con Nginx como proxy inverso, desplegados en AWS EC2 mediante pipelines CI/CD automatizados con GitHub Actions.

**Repositorio:** `https://github.com/DebugggMax/devops-ev2`  
**Rama de despliegue:** `deploy`  
**URL producción:** `http://3.92.157.252`

---

## Arquitectura General

```
                        INTERNET
                           │
                     Puerto 80 (HTTP)
                           │
                    ┌──────▼───────┐
                    │    NGINX     │   ← Único punto de entrada
                    │ Proxy Inverso│     Puerto 80 expuesto
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
   │  Frontend   │  │  Backend    │  │  Backend    │
   │ React+Nginx │  │  Despachos  │  │   Ventas    │
   │   :8080     │  │   :8081     │  │   :8082     │
   └─────────────┘  └──────┬──────┘  └──────┬──────┘
                           │                │
                    ┌──────▼────────────────▼──────┐
                    │          MySQL 8.0            │
                    │           :3306               │
                    └───────────────────────────────┘

          Red interna: red-monorepo (bridge)
```

### Infraestructura AWS (Terraform)

```
VPC: academy-vpc (10.0.0.0/20)
│
├── Subred Pública   (10.0.0.0/24) → ec2-web   → IP: 3.92.157.252
│                                     Nginx + Frontend
├── Subred Privada   (10.0.2.0/24) → ec2-app   → IP: 10.0.2.195
│                                     Backends Spring Boot
└── Subred Datos     (10.0.4.0/24) → ec2-datos → IP: 10.0.4.123
                                      MySQL 8.0
```

---

## Estructura del Monorepo

```
devops-ev2/
├── .github/
│   └── workflows/
│       ├── deploy-frontend.yml          ← CI/CD Frontend
│       ├── deploy-backend-despacho.yml  ← CI/CD Backend Despachos
│       └── deploy-backend-ventas.yml    ← CI/CD Backend Ventas
├── front_despacho/                      ← React + Vite
│   ├── src/
│   │   ├── componentes/CrudAdmin/
│   │   └── config/api.js
│   ├── .env.example
│   ├── Dockerfile
│   └── README.md
├── back-Despachos_SpringBoot/
│   └── Springboot-API-REST-DESPACHO/    ← Spring Boot :8081
│       ├── src/
│       ├── Dockerfile
│       └── README.md
├── back-Ventas_SpringBoot/
│   └── Springboot-API-REST/             ← Spring Boot :8082
│       ├── src/
│       ├── Dockerfile
│       └── README.md
├── nginx/
│   └── nginx.conf                       ← Configuración proxy inverso
├── docker-compose.yml
└── README.md                            ← Este archivo
```

---

##  Servicios Docker

| Servicio | Imagen base | Puerto | Descripción |
|---|---|---|---|
| `nginx-proxy` | `nginx:alpine` | `80:80` | Proxy inverso, único puerto público |
| `frontend` | `nginxinc/nginx-unprivileged:alpine` | `8080` (interno) | React compilado, usuario no root |
| `backend-despacho` | `eclipse-temurin:17-jre-alpine` | `8081` (interno) | API REST despachos |
| `backend-ventas` | `eclipse-temurin:17-jre-alpine` | `8082` (interno) | API REST ventas |
| `db` | `mysql:8.0` | `3306` (interno) | Base de datos relacional |

### Dockerfiles — Multi-stage Build

Todos los servicios usan **multi-stage build**:

**Frontend:**
- Etapa 1: `node:18-alpine` → `npm run build` → genera `/dist`
- Etapa 2: `nginxinc/nginx-unprivileged:alpine` → sirve `/dist` en `:8080`
-  Usuario no root |  Imagen ~50MB vs ~800MB

**Backends:**
- Etapa 1: `maven:3.8.8-eclipse-temurin-17` → `mvn clean package`
- Etapa 2: `eclipse-temurin:17-jre-alpine` → ejecuta el JAR
-  Solo JRE en producción |  Imagen ~150MB vs ~600MB

---

## Volúmenes Docker

```yaml
volumes:
  mysql_data:    # Named volume para MySQL
```

| Tipo | Servicio | Justificación |
|---|---|---|
| **Named volume** | MySQL (`db`) | Docker gestiona el almacenamiento independiente del path del host. Portátil entre entornos, persiste ante reinicios de contenedores. |

> **Named volume vs Bind mount:** Se eligió named volume porque es gestionado por Docker engine, no depende de la estructura de directorios del host, y es la práctica recomendada para bases de datos en contenedores.

---

## Enrutamiento Nginx

```nginx
location /                      → frontend:8080
location /api/v1/despachos      → backend-despacho:8081
location /api/v1/ventas         → backend-ventas:8082
location /despachos/swagger-ui/ → backend-despacho:8081/swagger-ui/
location /despachos/v3/api-docs → backend-despacho:8081/v3/api-docs
location /ventas/swagger-ui/    → backend-ventas:8082/swagger-ui/
location /ventas/v3/api-docs    → backend-ventas:8082/v3/api-docs
```

---

## Variables de Entorno

### Frontend

Crea el archivo `.env.local` en `front_despacho/` (ver `.env.example`):

```env
# Local
VITE_API_DESPACHOS=http://localhost/api/v1/despachos
VITE_API_VENTAS=http://localhost/api/v1/ventas

# AWS (usar IP pública de ec2-web)
VITE_API_DESPACHOS=http://3.92.157.252/api/v1/despachos
VITE_API_VENTAS=http://3.92.157.252/api/v1/ventas
```

### Backends (docker-compose.yml)

```yaml
environment:
  - DB_ENDPOINT=db
  - DB_PORT=3306
  - DB_NAME=dbevaluacion
  - DB_USERNAME=devops_user
  - DB_PASSWORD=devops_password
```

---

## Ejecución Local

### Requisitos

- Docker Desktop / Docker Engine
- Docker Compose v2
- Git

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/DebugggMax/devops-ev2.git
cd devops-ev2
git checkout deploy

# 2. Crear variables de entorno del frontend
cp front_despacho/.env.example front_despacho/.env.local
# Editar .env.local con los valores correctos

# 3. Levantar el stack completo
docker compose up --build

# 4. Verificar contenedores
docker ps
```

### URLs disponibles localmente

| URL | Descripción |
|---|---|
| `http://localhost` | Frontend React |
| `http://localhost/api/v1/despachos` | API Despachos |
| `http://localhost/api/v1/ventas` | API Ventas |
| `http://localhost/despachos/swagger-ui/index.html` | Swagger Despachos |
| `http://localhost/ventas/swagger-ui/index.html` | Swagger Ventas |

---

## CI/CD — GitHub Actions

Tres pipelines **independientes** activados por cambios en carpetas específicas:

| Workflow | Trigger (paths) | Registry | Deploy |
|---|---|---|---|
| `deploy-frontend.yml` | `front_despacho/**` | `ghcr.io/debugggmax/frontend-despacho` | ec2-web |
| `deploy-backend-despacho.yml` | `back-Despachos_SpringBoot/**` | `ghcr.io/debugggmax/backend-despacho` | ec2-web |
| `deploy-backend-ventas.yml` | `back-Ventas_SpringBoot/**` | `ghcr.io/debugggmax/backend-ventas` | ec2-web |

### Flujo de cada pipeline

```
Push a rama deploy
        │
        ▼
  ¿Cambios en mi carpeta?
        │
        ▼
  Build imagen Docker
  (con secrets VITE_*)
        │
        ▼
  Push a GHCR
  (ghcr.io/debugggmax/...)
        │
        ▼
  SSH a EC2
  docker compose pull <servicio>
  docker compose up -d --no-deps <servicio>
```

### Secrets requeridos en GitHub

| Secret | Descripción |
|---|---|
| `CR_PAT` | Personal Access Token para GHCR |
| `EC2_FRONTEND_HOST` | IP pública EC2 (`3.92.157.252`) |
| `EC2_BACKEND_HOST` | IP pública EC2 (`3.92.157.252`) |
| `EC2_USER` | Usuario SSH (`ec2-user`) |
| `EC2_SSH_KEY` | Contenido completo del archivo `.pem` |
| `VITE_API_DESPACHOS` | `http://3.92.157.252/api/v1/despachos` |
| `VITE_API_VENTAS` | `http://3.92.157.252/api/v1/ventas` |

---

## Despliegue en AWS

### Infraestructura (Terraform)

```bash
cd terraform/
# Configurar credenciales AWS Academy en ~/.aws/credentials
terraform init
terraform plan
terraform apply
```

Crea: VPC, 3 subredes, 3 EC2, IGW, NAT Gateway, 3 Security Groups, EIP.

### Security Groups

| SG | Puerto | Origen |
|---|---|---|
| `web-sg` | 80, 22 | `0.0.0.0/0` |
| `app-sg` | 8081, 8082, 22 | Solo `web-sg` |
| `datos-sg` | 3306, 22 | Solo `app-sg` |

### Configurar EC2 (primera vez)

```bash
# Conectar
ssh -i ~/labsuser.pem ec2-user@3.92.157.252

# Instalar Docker
sudo dnf update -y && sudo dnf install -y docker git
sudo systemctl start docker && sudo systemctl enable docker
sudo usermod -aG docker ec2-user
newgrp docker

# Instalar Docker Compose
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Instalar Buildx
sudo curl -L https://github.com/docker/buildx/releases/download/v0.17.1/buildx-v0.17.1.linux-amd64 \
  -o /usr/local/lib/docker/cli-plugins/docker-buildx
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-buildx

# Clonar repo y levantar
mkdir -p ~/app && cd ~/app
git clone https://<usuario>:<CR_PAT>@github.com/DebugggMax/devops-ev2.git .
git checkout deploy
docker compose up -d
```

### URLs en producción

| URL | Descripción |
|---|---|
| `http://3.92.157.252` | Frontend React |
| `http://3.92.157.252/despachos/swagger-ui/index.html` | Swagger Despachos |
| `http://3.92.157.252/ventas/swagger-ui/index.html` | Swagger Ventas |

---

## APIs

### Backend Despachos (`:8081`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/despachos` | Listar despachos |
| GET | `/api/v1/despachos/{id}` | Obtener por ID |
| POST | `/api/v1/despachos` | Crear despacho |
| PUT | `/api/v1/despachos/{id}` | Actualizar despacho |
| DELETE | `/api/v1/despachos/{id}` | Eliminar despacho |

### Backend Ventas (`:8082`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/ventas` | Listar ventas |
| GET | `/api/v1/ventas/{id}` | Obtener por ID |
| POST | `/api/v1/ventas` | Crear venta |
| PUT | `/api/v1/ventas/{id}` | Actualizar venta |
| DELETE | `/api/v1/ventas/{id}` | Eliminar venta |

---

## Stack Tecnológico

| Tecnología | Versión | Rol |
|---|---|---|
| React | 18.2.0 | Framework frontend |
| Vite | 5.2.0 | Bundler y build tool |
| Spring Boot | 3.4.4 | Framework backend |
| Java | 17 | Lenguaje backend |
| MySQL | 8.0 | Base de datos |
| Nginx | alpine | Proxy inverso + servidor web |
| Docker | 25.0.14 | Contenedorización |
| Docker Compose | v2 | Orquestación |
| Terraform | latest | Infraestructura como código |
| GitHub Actions | - | CI/CD |
| GitHub Container Registry | - | Registro de imágenes |
| AWS EC2 | t3.micro | Instancias de cómputo |
| Amazon Linux | 2023 | OS de las instancias |

---

## Autor

**Maximiliano Olguin y Camila Ibarra**  
ISY1101 — Introducción a Herramientas DevOps  
DuocUC — Evaluación Parcial N°2
