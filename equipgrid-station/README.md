# EquipGrid Station 🏢 (Hub & Yard Operations Desk)

> Station Operations Dashboard and Yard Management portal for EquipGrid hub managers, yard operators, and field coordinators across peri-urban and rural centers.

---

## 📖 Overview

**EquipGrid Station** is the operational interface used on-site at EquipGrid rental hubs (e.g., Sandila, Hardoi, Lucknow). It bridges digital orders from the WhatsApp bot and web portal with physical machinery handovers, technical inspections, digital delivery challans, and instant security deposit settlements.

### Core Modules & Features

- 📊 **Hub Operations Dashboard:**
  - Real-time fleet overview: Total units, machines on rent, units ready in yard, and units in maintenance.
  - Quick action alerts: Pickups scheduled today, overdue returns, and pending damage inspections.
  - Daily yard revenue and equipment turnaround metrics.
- 🚜 **Equipment Registry & QR Tagging (`/equipment`):**
  - Catalog of agricultural and construction machinery with asset tags and serial numbers.
  - Real-time status toggling: `AVAILABLE`, `RENTED`, `UNDER_MAINTENANCE`, `RESERVED`.
  - Machine media previews (photos and 10s inspection demo videos).
  - Hub-to-hub machinery transfer management.
- 📝 **Booking Desk & Customer KYC (`/booking`):**
  - Manage in-person walk-in bookings and pre-booked WhatsApp reservations.
  - Customer profile verification, Aadhaar/phone verification, and farm/site location verification.
  - Transparent pricing breakdown: daily/weekly rental rates, transit charges, and refundable security deposit.
- 🚚 **Dispatch & Release Checklist (`/dispatch`):**
  - Step-by-step pre-handover physical checklist (oil level, blade condition, tire pressure, battery charge).
  - Photographic evidence capture prior to equipment release.
  - Digital Delivery Challan generation with authorized yard sign-off.
- 🔍 **Return Inspection & Deposit Refund (`/returninspection`):**
  - Standardized return intake inspection.
  - Component-by-component damage and missing parts assessment.
  - Automated calculation of net refundable security deposit after deductions.
- 💳 **Yard Payment Desk (`/payment`):**
  - Dynamic on-screen UPI QR code generator for advance payment and security deposit collection.
  - Manual UTR (Unique Transaction Reference) recording and cash transaction logs.
  - Instant security deposit refund receipts.
- 🤝 **Dealer & Partner Pooling (`/dealer`):**
  - Manage third-party dealer equipment enrolled in the EquipGrid network.
  - Revenue sharing and dealer machine availability logs.
- 📍 **Regional Settings (`/location`):**
  - Regional hub configuration (Sandila, Hardoi, Lucknow, Sitapur, etc.) with operational boundaries.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | React 19.x |
| **Language** | TypeScript (~6.0) |
| **Build Tool & Dev Server** | Vite 8.x |
| **Styling** | Tailwind CSS v4.x (`@tailwindcss/vite`) |
| **Icons** | Lucide React |
| **Routing** | React Router DOM v7 |
| **Linter** | Oxlint (Ultra-fast Rust-based linter) |

---

## 📂 Project Structure

```
equipgrid-station/
├── package.json                   # Dependencies and scripts
├── vite.config.ts                 # Vite 8 configuration with Tailwind v4 plugin
├── index.html                     # HTML entry point
└── src/
    ├── app/                       # Application shell and route definitions
    ├── assets/                    # Static branding and icons
    ├── components/                # Shared UI components (Modals, Tables, Cards, Badges)
    ├── features/                  # Domain-driven feature modules
    │   ├── auth/                  # Station operator login & session state
    │   ├── booking/               # Desk bookings, rental quotes, customer KYC
    │   ├── dashboard/             # Live yard analytics, active dispatches & alerts
    │   ├── dealer/                # Partner equipment pooling and revenue shares
    │   ├── dispatch/              # Check-out checklist, challan issuance, photo capture
    │   ├── equipment/             # Machine registry, status toggles, QR linking
    │   ├── location/              # Hub locations, state/city hierarchies
    │   ├── payment/               # UPI QR code rendering, UTR reconciliation
    │   ├── rentalconfig/          # Pricing rules, duration tiers, deposit schedules
    │   ├── reporting/             # Yard turnaround times and utilization reports
    │   ├── returninspection/      # Check-in inspection, damage assessment & refund
    │   └── users/                 # Station staff roles and permissions
    ├── lib/                       # Utility helpers (formatters, date math, class merger)
    ├── services/                  # API client services calling equipgrid-power
    ├── types/                     # Shared TypeScript interfaces and enums
    ├── index.css                  # Design system tokens and Tailwind CSS imports
    └── main.tsx                   # React root entry
```

---

## ⚙️ Environment Configuration

Create a `.env` file in `equipgrid-station/` (or copy from `.env.example`):

```bash
# Backend API Base URL
VITE_API_BASE_URL=http://localhost:8081

# Current Station Hub Identifier (e.g. HUB-SANDILA, HUB-HARDOI, HUB-LUCKNOW)
VITE_DEFAULT_HUB_ID=HUB-SANDILA
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ installed (`node -v`)
- Backend service (`equipgrid-power`) running on port `8081`

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
The application will launch on `http://localhost:3000` (or `http://localhost:5173`).

### 3. Build for Production
```bash
npm run build
```
Compiled production assets will be output to `dist/`.

### 4. Run Linter
```bash
npm run lint
```
