# EquipGrid 🚜🏗️

> Rural and Peri-Urban Agricultural & Civil Construction Machinery Rental Ecosystem in India.

EquipGrid is an integrated digital-to-physical equipment rental platform engineered for Tier-2, Tier-3, and rural markets across India. It connects farmers, infrastructure builders, and civil contractors with high-utility machinery through localized station hubs (such as Sandila, Hardoi, and Lucknow), accessible via automated WhatsApp AI, web booking, and dedicated yard management desks.

---

## 🏛️ Ecosystem Architecture & Products

The repository is structured as a cohesive monorepo encompassing three primary products:

```
EquipGrid/
├── equipgrid-power/      # ⚡ Core Backend (Spring Boot 3 + Java 21)
├── equipgrid-station/    # 🏢 Yard & Hub Operations Desk (React 19 + TypeScript + Vite 8)
├── equipgrid-website/    # 🌐 Public Customer & Partner Portal (React 19 + TypeScript + Vite 8)
├── scripts/              # 🛠️ Database seeders, test scripts, and S3 utilities
├── docker-compose.yml    # 🐳 Local infrastructure (PostgreSQL 16, Redis, LocalStack S3)
└── docker-compose.prod.yml # 🚀 Production orchestration configuration
```

---

### 1. [EquipGrid Power (Backend Service)](file:///Users/akashkumar/Documents/EquipGrid/equipgrid-power/README.md)
*Path: `equipgrid-power/` | Port: `8081`*

The enterprise Spring Boot 3 & Java 21 core platform responsible for business logic, inventory, pricing, and integrations:
- **WhatsApp Conversational Bot:** Meta Cloud API (`/whatsapp/webhook`) and Twilio form webhook integration with end-to-end booking state machine.
- **Multimodal Gemini AI Voice Note Engine (`VoiceNoteProcessingService`):** Automatic transcription and intent parsing of rural Hindi/Bhojpuri/Awadhi voice messages using Google Gemini 2.5 Flash (`inline_data` base64 audio stream).
- **Dynamic UPI QR Code Generator (`UpiQrGeneratorServiceImpl`):** On-the-fly rendering of scannable `upi://pay` Base64 PNG QR codes for advance rental and security deposit payments.
- **Fleet & Yard Lifecycle Management:** Multi-hub machinery catalog (Agriculture & Construction), digital Delivery Challan PDF generation (`ChallanDocumentService`), and return damage assessment.
- **Security & Bot Prevention:** Meta webhook HMAC-SHA256 signature verification, Cloudflare Turnstile BotShield, Mobile OTP pre-validation, and `@RateLimited` controllers.

👉 Read the detailed [EquipGrid Power Documentation](file:///Users/akashkumar/Documents/EquipGrid/equipgrid-power/README.md).

---

### 2. [EquipGrid Station (Hub & Yard Operations Desk)](file:///Users/akashkumar/Documents/EquipGrid/equipgrid-station/README.md)
*Path: `equipgrid-station/` | Port: `3000` / `5173`*

Modern operational dashboard for station managers and yard operators:
- **Station Dashboard:** Live fleet statistics, units ready in yard, active rentals, and pending return inspections.
- **Machine Registry & QR Tagging:** Physical asset status toggling (`AVAILABLE`, `RENTED`, `UNDER_MAINTENANCE`), serial numbers, and maintenance logs.
- **Desk Booking & KYC:** Walk-in customer onboarding, Aadhaar/phone verification, and rental order creation.
- **Dispatch Checklist & Challan:** Pre-handover inspection checklist, photo evidence upload, and delivery challan sign-off.
- **Return Inspection & Deposit Refund:** Check-in damage evaluation, missing parts assessment, and automated calculation of net deposit refunds.
- **Counter Payment Desk:** Instant on-screen UPI QR code generation and cash/UTR recording.

👉 Read the detailed [EquipGrid Station Documentation](file:///Users/akashkumar/Documents/EquipGrid/equipgrid-station/README.md).

---

### 3. [EquipGrid Website (Public Customer & Partner Portal)](file:///Users/akashkumar/Documents/EquipGrid/equipgrid-website/README.md)
*Path: `equipgrid-website/` | Port: `5173`*

Customer-facing digital storefront and dealer partnership portal:
- **Equipment Catalog:** Browse agriculture (Tractors, Reapers, Weeders, Rotavators) and construction (Mixers, Vibrators, Compactors, Jackhammers, Pumps, Generators) machinery with bilingual English/Hindi names.
- **Machine Specifications & Demo Previews:** Technical specs, high-resolution photo galleries, and 10-second inspection demo videos hosted on AWS S3.
- **Interactive Booking Wizard:** 4-step rental wizard with Mobile OTP pre-validation, duration date picker, delivery options (Hub Pickup, Farm Delivery, Site Delivery), and GPS coordinate pin entry.
- **WhatsApp Integration:** Instant click-to-chat links for farmers and contractors preferring voice or text messaging.
- **Dealer & Partner Network:** Franchise and machinery host onboarding for tractor owners and dealerships.
- **Hub Directory:** Interactive list of regional hubs with contact details and Google Maps locations.

👉 Read the detailed [EquipGrid Website Documentation](file:///Users/akashkumar/Documents/EquipGrid/equipgrid-website/README.md).

---

## 🚀 Quick Start & Local Development

### 1. Start Local Infrastructure (PostgreSQL, Redis, S3/LocalStack)
```bash
docker compose up -d
```

### 2. Start the Backend (`equipgrid-power`)
```bash
cd equipgrid-power
./gradlew bootRun
```
*Backend runs on `http://localhost:8081`.*

To run tests:
```bash
./gradlew test
```

### 3. Start the Station Operations Desk (`equipgrid-station`)
```bash
cd equipgrid-station
npm install
npm run dev
```
*Station desk runs on `http://localhost:3000` (or `http://localhost:5173`).*

### 4. Start the Public Website (`equipgrid-website`)
```bash
cd equipgrid-website
npm install
npm run dev
```
*Website runs on `http://localhost:5173`.*

---

## 🛡️ Security & Compliance
- **Meta WhatsApp Cloud API:** Validates incoming payload signatures via `X-Hub-Signature-256` HMAC-SHA256.
- **Cloudflare Turnstile:** Invisible bot barrier protecting public quote calculators and booking forms.
- **Mobile OTP Pre-Validation:** Enforces verified Indian mobile numbers before processing booking holds.
- **Dynamic UPI Payment:** Standard `upi://pay` generation with strict booking reference tracking.

---

## 📜 License
EquipGrid Proprietary — All Rights Reserved.