# 📦 Backend Despachos — Spring Boot

Microservicio REST para la gestión de órdenes de despacho de **Innovatech Chile**. Desarrollado con Spring Boot 3.4.4 y Java 17.

**Repositorio:** `https://github.com/DebugggMax/devops-ev2`

---

## Arquitectura

```
back-Despachos_SpringBoot/
└── Springboot-API-REST-DESPACHO/
    ├── src/
    │   └── main/java/com/citt/
    │       ├── controller/
    │       │   └── DespachoController.java
    │       ├── persistence/
    │       │   ├── entity/
    │       │   │   └── Despacho.java
    │       │   ├── repository/
    │       │   └── services/
    │       │       └── DespachoServiceImpl.java
    │       └── SpringBootApplication.java
    ├── src/main/resources/
    │   └── application.properties
    ├── Dockerfile
    └── pom.xml
```

---

## Dockerfile — Multi-stage Build

```dockerfile
# ETAPA 1: Compilar con Maven
FROM maven:3.8.8-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml ./
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests -Dmaven.test.skip=true

# ETAPA 2: Runtime solo JRE (imagen mínima)
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**¿Por qué multi-stage?**
- La imagen final contiene solo el JRE y el JAR (~150MB vs ~600MB con Maven completo)
- Maven y el código fuente no llegan a producción
- Menor superficie de ataque

---

## Variables de Entorno

| Variable | Descripción | Valor en Docker Compose |
|---|---|---|
| `DB_ENDPOINT` | Host de MySQL | `db` (nombre servicio Docker) |
| `DB_PORT` | Puerto MySQL | `3306` |
| `DB_NAME` | Nombre de la BD | `dbevaluacion` |
| `DB_USERNAME` | Usuario MySQL | `devops_user` |
| `DB_PASSWORD` | Contraseña MySQL | `devops_password` |

Configuración en `application.properties`:
```properties
spring.datasource.url=jdbc:mysql://${DB_ENDPOINT}:${DB_PORT}/${DB_NAME}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}
spring.jpa.hibernate.ddl-auto=update
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect

# Swagger
springdoc.swagger-ui.path=/swagger-ui.html
springdoc.swagger-ui.config-url=/despachos/v3/api-docs/swagger-config
springdoc.swagger-ui.url=/despachos/v3/api-docs
```

---

## Endpoints REST

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/despachos` | Listar todos los despachos |
| GET | `/api/v1/despachos/{id}` | Obtener despacho por ID |
| POST | `/api/v1/despachos` | Crear nuevo despacho |
| PUT | `/api/v1/despachos/{id}` | Actualizar despacho |
| DELETE | `/api/v1/despachos/{id}` | Eliminar despacho |

**Swagger UI:** `http://localhost/despachos/swagger-ui/index.html`

---

## Entidad Despacho

```java
@Entity
public class Despacho {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idDespacho;
    private LocalDate fechaDespacho;
    private String patenteCamion;
    private int intento;
    private Long idCompra;
    private String direccionCompra;
    private Long valorCompra;
    private boolean despachado = false;
}
```

> **Nota:** Se usa `GenerationType.IDENTITY` (no AUTO) para compatibilidad con MySQL 8 + Hibernate 6.

---

## Ejecución Local

### Con Docker Compose (recomendado)

```bash
# Desde la raíz del monorepo
docker compose up --build backend-despacho
```

### Sin Docker

```bash
cd back-Despachos_SpringBoot/Springboot-API-REST-DESPACHO
./mvnw spring-boot:run
```

Requiere MySQL corriendo en `localhost:3306`.

---

## Pipeline CI/CD

El workflow `.github/workflows/deploy-backend-despacho.yml` se dispara cuando hay un push a la rama `deploy` con cambios en `back-Despachos_SpringBoot/**`.

**Flujo:**
1. Setup Java 17 + cache Maven
2. Build imagen Docker
3. Push a `ghcr.io/debugggmax/backend-despacho:latest`
4. SSH a EC2 → `docker compose pull backend-despacho` → `docker compose up -d --no-deps backend-despacho`

---

## Dependencias principales

| Dependencia | Versión | Uso |
|---|---|---|
| spring-boot-starter-web | 3.4.4 | API REST |
| spring-boot-starter-data-jpa | 3.4.4 | Persistencia |
| mysql-connector-j | runtime | Driver MySQL |
| springdoc-openapi-starter-webmvc-ui | latest | Swagger UI |
| lombok | latest | Reducción boilerplate |
