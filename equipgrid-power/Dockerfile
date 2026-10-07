# Stage 1: Build Java 21 Spring Boot Application
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# Cache gradle wrapper and dependencies
COPY gradlew ./
COPY gradle ./gradle
COPY build.gradle settings.gradle ./
RUN chmod +x ./gradlew && ./gradlew dependencies --no-daemon || true

# Copy source code and build runnable boot jar
COPY src ./src
RUN ./gradlew bootJar -x test --no-daemon

# Stage 2: Minimal Runtime JRE
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S equipgrid && adduser -S equipgrid -G equipgrid
USER equipgrid:equipgrid

COPY --from=build /app/build/libs/*.jar app.jar

ENV SPRING_PROFILES_ACTIVE=prod
ENV SERVER_PORT=8081

EXPOSE 8081

ENTRYPOINT ["java", "-XX:+UseG1GC", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
