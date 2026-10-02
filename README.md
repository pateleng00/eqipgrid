# EquipGrid 🚜🏗️

EquipGrid is a rural agriculture & civil construction equipment rental ecosystem engineered for peri-urban and tier-2/3/4 markets in India.

## Monolith Architecture

This repository houses the core operational services and station manager portal:

* **`equipgrid-power/`**: Spring Boot 3 + Java 21 backend service.
  - Multi-hub inventory, pricing calculation engine, dispatch logs, and payment receipts.
  - Automated WhatsApp bot engine (AI-driven conversational onboarding, category narrowing, station hub filtering, dynamic conflict-free availability, and bilingual Hindi/English equipment display).
  - Dynamic UPI QR code generator (`upi://pay`) with automated UTR confirmation.
  - AWS S3 integration for equipment photos and 10-second demo inspection videos.
  - PostgreSQL schema managed via Flyway migrations.

* **`equipgrid-station/`**: Modern React + TypeScript + Vite frontend.
  - Station desk operations dashboard for yard managers.
  - Real-time fleet tracking, booking desk, return inspection & instant security deposit refunds.
  - Dark/Daylight aesthetic with glassmorphism and real-time state synchronization.

* **`scripts/`**: Development and automation utilities (database seeders, S3 asset uploaders).
* **`docker-compose.yml`**: Local infrastructure (PostgreSQL 17, AWS S3/Localstack).

*(Note: `equipgrid-website` is maintained in a separate repository for customer-facing marketing and SEO.)*

---

## Getting Started

### 1. Backend (`equipgrid-power`)
```bash
cd equipgrid-power
./gradlew bootRun
```
Backend runs on `http://localhost:8081`.

### 2. Frontend Station Desk (`equipgrid-station`)
```bash
cd equipgrid-station
npm install
npm run dev
```
Frontend runs on `http://localhost:3000`.