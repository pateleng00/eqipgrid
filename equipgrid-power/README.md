# EquipGrid Power ⚡ (Core Backend Platform)

> Enterprise Spring Boot 3 & Java 21 backend service powering EquipGrid's rural equipment rental ecosystem, WhatsApp AI conversational bot, multimodal Gemini voice processing, dynamic UPI QR payments, and fleet logistics.

---

## 📖 Overview

**EquipGrid Power** is the central engine for rural agriculture and construction machinery rentals in India. It is specifically designed to handle low-bandwidth mobile environments, bilingual Hindi/English conversational commerce, rural farm/site GPS pin coordinates, and automated yard logistics.

### Key Capabilities

- 🤖 **WhatsApp AI Conversational Engine:**
  - Official Meta WhatsApp Cloud API integration with automated verification challenges and `X-Hub-Signature-256` HMAC validation.
  - Twilio form-urlencoded webhook fallback support.
  - Full conversational state machine: category narrowing (Agriculture vs Construction), hub selection, date selection, live quote generation, delivery coordination, and booking management.
- 🎙️ **Multimodal Voice Note Processing (`VoiceNoteProcessingService`):**
  - Directly ingests WhatsApp voice notes (OGG Opus audio) from Meta Cloud API.
  - Multimodal speech-to-intent using **Google Gemini 2.5 Flash** (`inline_data` base64 audio stream).
  - Transcribes Hindi, Bhojpuri, Awadhi, and Hinglish speech.
  - Extracts structured intents (`BROWSE_RENT`, `TRACK_ORDER`, `PAY`, `RETURN`, `HELP`), machine hints, rental duration, and hub locations.
  - Fast-response generation config with zero thinking budget and intelligent keyword extraction fallback.
- 💳 **Dynamic UPI QR Payment Generator (`UpiQrGeneratorServiceImpl`):**
  - Renders scannable `upi://pay` URI strings and Base64 PNG images for advance rent and security deposits.
  - Custom merchant desk QR endpoints (`/whatsapp/qr/{bookingNumber}`, `/whatsapp/qr/desk`).
  - UTR submission and automated reconciliation.
- 🚜 **Asset & Inventory Lifecycle:**
  - Multi-hub inventory tracking across Uttar Pradesh (Sandila, Hardoi, Lucknow, etc.).
  - Machinery catalog for Agriculture (Tractors, Rotavators, Power Weeders, Crop Reapers) and Construction (Concrete Mixers, Vibrators, Plate Compactors, Demolition Jackhammers, Trash Pumps, Generators).
  - AWS S3 integration for machine photos and 10-second inspection demo videos.
- 📋 **Dispatch & Yard Operations:**
  - Multi-stage booking lifecycle: `DRAFT` → `CONFIRMED` → `DISPATCHED` → `ACTIVE` → `RETURNED` → `COMPLETED`.
  - Automated PDF Digital Delivery Challan generation (`ChallanDocumentService`) with equipment checklists.
  - Pre-dispatch and return inspection checklists with security deposit deduction calculation.
- 🛡️ **Security & Anti-Abuse:**
  - Mobile OTP Pre-Validation Barrier (`OtpVerificationService`) with WhatsApp OTP delivery.
  - Cloudflare Turnstile BotShield verification.
  - In-memory rate limiting (`@RateLimited`).
  - JWT authentication and role-based access control.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Language & Runtime** | Java 21 (OpenJDK / Eclipse Temurin) |
| **Framework** | Spring Boot 3.3.5 |
| **Build Tool** | Gradle 8.x / 9.x |
| **Database** | PostgreSQL 17 (Production) / H2 In-Memory (Test/CI) |
| **Database Migrations** | Flyway |
| **Object Storage** | AWS S3 / LocalStack |
| **AI / Multimodal** | Google Gemini Generative AI (Gemini 2.5 Flash) |
| **Messaging** | Meta WhatsApp Cloud API (Graph API v21.0), Twilio Webhooks |
| **QR Generation** | ZXing (Zebra Crossing) |
| **Document Generation** | OpenPDF / iText PDF |
| **Security** | Spring Security 6, Nimbus JOSE JWT, HMAC-SHA256 |

---

## 📂 Project Structure

```
equipgrid-power/
├── build.gradle                   # Gradle dependencies and build configuration
├── gradlew / gradlew.bat          # Gradle wrappers
├── Dockerfile                     # Multi-stage container build
└── src/
    ├── main/
    │   ├── java/com/equipgrid/
    │   │   ├── EquipGridPowerApplication.java
    │   │   ├── asset/             # Machinery inventory, categories, specs, S3 media
    │   │   ├── auth/              # JWT auth, user sessions, OTP validation barrier
    │   │   ├── booking/           # Rental orders, pricing engine, booking lifecycles
    │   │   ├── customer/          # Farmer and contractor customer profiles
    │   │   ├── dealer/            # Equipment dealers and supplier partnerships
    │   │   ├── dispatch/          # Dispatch jobs, checklists, PDF delivery challans
    │   │   ├── farmlocation/      # GPS farm/site geo-location coordinates
    │   │   ├── location/          # State, City, Hub hierarchies
    │   │   ├── payment/           # Payment proofs, UTR verification, deposit ledger
    │   │   ├── returninspection/  # Return check-ins, damage checklists, deposit refunds
    │   │   ├── whatsapp/          # Meta Webhook, Bot state machine, UPI QR generator
    │   │   │   ├── controller/    # WhatsAppWebhookController
    │   │   │   ├── service/       # VoiceNoteProcessingService, WhatsAppBotServiceImpl,
    │   │   │   │                  # MetaWhatsAppClientService, UpiQrGeneratorServiceImpl
    │   │   │   └── security/      # MetaSignatureValidator (HMAC-SHA256)
    │   │   └── core/              # Rate limiter, Turnstile bot shield, exception handlers
    │   └── resources/
    │       ├── application.properties  # App configurations & environment mappings
    │       └── db/migration/           # Flyway SQL migration scripts (V1...)
    └── test/                          # Unit and integration test suites
```

---

## ⚙️ Configuration & Environment Variables

Key properties configured in `src/main/resources/application.properties`:

| Environment Variable | Description | Default / Example |
|---|---|---|
| `SERVER_PORT` | HTTP port for backend service | `8081` |
| `SPRING_DATASOURCE_URL` | PostgreSQL connection JDBC URL | `jdbc:postgresql://localhost:5432/equipgrid` |
| `SPRING_DATASOURCE_USERNAME` | Database username | `postgres` |
| `SPRING_DATASOURCE_PASSWORD` | Database password | `postgres` |
| `META_PHONE_NUMBER_ID` | WhatsApp Business Phone Number ID | Meta App Dashboard ID |
| `META_ACCESS_TOKEN` | Meta System User Permanent Access Token | `EAAS...` |
| `META_VERIFY_TOKEN` | Webhook verification challenge secret | `eq_whk_...` |
| `META_APP_SECRET` | Meta App Secret for `X-Hub-Signature-256` | Meta App Secret |
| `META_VERIFY_SIGNATURE` | Enforce HMAC signature check | `false` (dev) / `true` (prod) |
| `GEMINI_API_KEY` | Google Gemini API Key for speech transcription | `AIzaSy...` |
| `GEMINI_MODEL` | Gemini multimodal model name | `gemini-2.5-flash` |
| `AWS_S3_ACCESS_KEY` | AWS IAM Access Key | `AKIA...` |
| `AWS_S3_SECRET_KEY` | AWS IAM Secret Key | `XaLs...` |
| `AWS_S3_COMMON_BUCKET_NAME`| S3 Bucket for photos and 10s inspection videos | `equipgrid-assets-dev` |
| `EQUIPGRID_UPI_VPA` | Merchant active UPI Virtual Payment Address | `equipgrid@upi` |
| `EQUIPGRID_UPI_PAYEE_NAME` | Payee name displayed in UPI apps | `EquipGrid Rentals` |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key | Cloudflare Secret |

---

## 🚀 Running Locally

### Prerequisites
- Java 21 JDK installed (`java -version`)
- PostgreSQL 17 running (or use `docker compose up postgres -d`)

### 1. Build the Application
```bash
./gradlew build -x test
```

### 2. Run the Service
```bash
./gradlew bootRun
```
The server will start on `http://localhost:8081`.

### 3. Run Automated Tests
```bash
./gradlew test
```
To run specific integration tests:
```bash
# WhatsApp Webhook & Voice Processing Integration Test
./gradlew test --tests WhatsAppVoiceWebhookIntegrationTest

# End-to-end WhatsApp Rental Lifecycle Integration Test
./gradlew test --tests WhatsAppFlowIntegrationTest
```

---

## 📡 Key REST & Webhook Endpoints

### WhatsApp & Voice Bot
- `GET /whatsapp/webhook`: Meta Cloud API verification challenge endpoint.
- `POST /whatsapp/webhook`: Meta JSON & Twilio form inbound webhook receiver.
- `POST /whatsapp/simulate`: Interactive testing endpoint for WhatsApp bot flows and audio notes.
- `GET /whatsapp/qr/{bookingNumber}`: Generates scannable UPI QR code PNG for a booking's advance & security deposit.
- `GET /whatsapp/qr/desk`: Generates scannable Merchant Desk UPI QR code PNG for yard counters.

### Core Resources
- `GET /api/v1/assets`: Machinery catalog with filters (category, hub, availability).
- `GET /api/v1/assets/{id}`: Detailed machine specification and S3 media URLs.
- `POST /api/v1/bookings`: Create and confirm equipment rental bookings.
- `POST /api/v1/otp/request`: Trigger mobile pre-validation OTP via WhatsApp.
- `POST /api/v1/otp/verify`: Verify OTP and obtain proof token.
- `GET /api/v1/dispatch/{id}/challan`: Download PDF Delivery Challan.
