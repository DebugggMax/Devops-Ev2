# 🛒 Backend Ventas — Spring Boot

Microservicio REST para la gestión de órdenes de compra (ventas) de **Innovatech Chile**. Desarrollado con Spring Boot 3.4.4 y Java 17.

**Repositorio:** `https://github.com/DebugggMax/devops-ev2`

---

## Arquitectura

```
back-Ventas_SpringBoot/
└── Springboot-API-REST/
    ├── src/
    │   └── main/java/com/citt/
    │       ├── controller/
    │       │   └── VentaController.java
    │       ├── persistence/
    │       │   ├── entity/
    │       │   │   └── Venta.java
    │       │   ├── repository/
    │       │   └── services/
    │       │       └── VentaServiceImpl.java
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
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "app.jar"]
```

---

## ⚙️ Variables de Entorno

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
springdoc.swagger-ui.config-url=/ventas/v3/api-docs/swagger-config
springdoc.swagger-ui.url=/ventas/v3/api-docs
```

---

## 📡 Endpoints REST

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/ventas` | Listar todas las ventas |
| GET | `/api/v1/ventas/{id}` | Obtener venta por ID |
| POST | `/api/v1/ventas` | Crear nueva venta |
| PUT | `/api/v1/ventas/{id}` | Actualizar venta (ej: marcar despacho generado) |
| DELETE | `/api/v1/ventas/{id}` | Eliminar venta |

**Swagger UI:** `http://localhost/ventas/swagger-ui/index.html`

---

## Entidad Venta

```java
@Entity
@Builder
public class Venta {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idVenta;
    private String direccionCompra;
    private int valorCompra;
    private LocalDate fechaCompra;
    private Boolean despachoGenerado = false;
}
```

> **Nota:** Se usa `GenerationType.IDENTITY` para compatibilidad con MySQL 8 + Hibernate 6. `@JsonProperty(access = READ_ONLY)` en el ID evita que llegue `id: 0` en peticiones POST.

---

##  Ejecución Local

### Con Docker Compose (recomendado)

```bash
# Desde la raíz del monorepo
docker compose up --build backend-ventas
```

### Sin Docker

```bash
cd back-Ventas_SpringBoot/Springboot-API-REST
./mvnw spring-boot:run
```

Requiere MySQL corriendo en `localhost:3306`.

---

## 🔄 Pipeline CI/CD

El workflow `.github/workflows/deploy-backend-ventas.yml` se dispara cuando hay un push a la rama `deploy` con cambios en `back-Ventas_SpringBoot/**`.

**Flujo:**
1. Setup Java 17 + cache Maven
2. Build imagen Docker
3. Push a `ghcr.io/debugggmax/backend-ventas:latest`
4. SSH a EC2 → `docker compose pull backend-ventas` → `docker compose up -d --no-deps backend-ventas`

---

## Dependencias principales

| Dependencia | Versión | Uso |
|---|---|---|
| spring-boot-starter-web | 3.4.4 | API REST |
| spring-boot-starter-data-jpa | 3.4.4 | Persistencia |
| mysql-connector-j | runtime | Driver MySQL |
| springdoc-openapi-starter-webmvc-ui | latest | Swagger UI |
| lombok | latest | Reducción boilerplate |
| spring-boot-starter-validation | 3.4.4 | Validación de campos |
