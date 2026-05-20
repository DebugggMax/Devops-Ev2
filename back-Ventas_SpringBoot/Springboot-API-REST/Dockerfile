# ETAPA 1: Construcción del JAR (Multi-stage)
FROM maven:3.8.8-eclipse-temurin-17 AS build
WORKDIR /app
COPY . .
# Forzamos a ignorar los tests para que no falle al compilar por culpa de la BD
RUN mvn clean package -DskipTests -Dmaven.test.skip=true

# ETAPA 2: Ejecución Segura (Rúbrica: Usuario No-Root)
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN addgroup -S spring && adduser -S spring -G spring
USER spring
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]