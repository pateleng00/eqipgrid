# EquipGrid: Farmer-First Simplification Plan

## Purpose

Make EquipGrid easy to use for rural and low-literacy farmers without weakening the operational controls needed by the station, yard, driver, finance, and maintenance teams.

The farmer should be able to book by voice, buttons, or a local helper. They should not need to understand equipment catalogues, internal booking statuses, dispatch terminology, or rental calculations.

> Implementation note (2026-10-13): saved local farm locations, booking location snapshots, calculated farm distance, payment-proof safety, duplicate-reference protection, return pickup requests, delivery/pickup job records, pending refund records, and a task recommendation API are implemented. Provider-specific payment verification and UPI payout execution remain integration points because this repository has no configured payment provider credentials or webhook contract. They must not be represented to farmers as completed until that connection exists.

---

## 1. Current Flow and Gaps

### Current farmer WhatsApp flow

```text
Menu
  -> category
  -> hub
  -> rental duration
  -> machine catalogue
  -> machine selection
  -> delivery type
  -> location pin/address
  -> quotation
  -> confirm
  -> UPI QR payment
  -> dispatch
  -> return request
  -> inspection and settlement notification
```

### Current station flow

```text
State/city/hub/category filters
  -> select available machine
  -> find or add customer
  -> select rental dates, distance, delivery address and operator
  -> calculate quote
  -> create booking
  -> collect deposit and advance
  -> yard handover checklist
  -> dispatch/on-rent
  -> return inspection
  -> close booking
```

### Pain points to address

| Area | Current issue | Why it is a problem |
| --- | --- | --- |
| Discovery | Farmer must select a machine before getting help. | Farmers usually know the task, crop, acreage and urgency—not the machine model. |
| Location | A booking holds one typed delivery address. | One farmer can have several farms; local names are more useful than formal addresses. |
| Language | The flow is bilingual but still long and text-heavy. | Reading, typing and interpreting commercial terms remain barriers. |
| Dates | WhatsApp defaults the rental start date to tomorrow. | Farmers need Today/Tomorrow/specific-date choices, especially during seasonal peaks. |
| Quote | WhatsApp uses a fixed 15 km distance and no operator. | Quote can differ from actual delivery and service requirements. |
| Payment | `PAID` or a UTR-like message records payment. | This is unsafe and can create false confirmations or duplicate payments. |
| Statuses | Internal statuses are exposed conceptually to customers. | `ALLOCATED`, `DISPATCH_READY`, and `ON_RENT` are not farmer language. |
| Return | A return request does not create a clear pickup task/slot. | Recovery teams cannot reliably plan collection. |
| Refund | A settlement is calculated and notified, but no actual refund is initiated. | The customer promise and system behaviour can diverge. |

---

## 2. Product Principle

### Farmer sees a service, not rental software

Use local spoken language, voice notes, buttons, photos, and a simple call-back option. Ask only what is needed to make a safe and useful recommendation.

### Farmer-facing status language

```text
Request received
  -> Booking confirmed
  -> Machine on the way
  -> Machine delivered / work in progress
  -> Return pickup booked
  -> Deposit refunded
```

Keep detailed internal booking and machine statuses for the station portal only.

---

## 3. Target Farmer Booking Flow

### First-time farmer

```text
Voice/text: "Kal gehun kaatne ki machine chahiye"
  -> What work do you need done?
  -> When do you need it? [Today] [Tomorrow] [Choose date]
  -> Where should it go? [Saved farm] [Add new farm] [Call me]
  -> Show 1–2 recommended options with simple all-in price
  -> [Book now] [Talk to local helper]
  -> Verified payment or confirmed pay-at-delivery option
  -> Booking confirmed and delivery time communicated
```

### Repeat farmer

```text
Book again
  -> choose task or favourite machine
  -> choose saved farm
  -> choose today/tomorrow
  -> confirm price
  -> book
```

### Example farmer interaction

> किसान: “कल निराई के लिए मशीन चाहिए।”  
> EquipGrid: “आपके लिए पावर वीडर सही रहेगा। मशीन कहाँ भेजनी है?”  
> 1. बड़ा खेत — नहर के पास  
> 2. घर के पीछे वाला खेत  
> 3. नया खेत जोड़ें  
> 4. मुझे फोन करें

---

## 4. Multiple Farms and Local-Name Location Mapping

### Required concept: `FarmLocation`

Do not store a single delivery address directly on the customer as the primary destination. A farmer has zero or more saved farm locations. A booking selects one location and stores a snapshot of it for historical accuracy.

```text
Customer
  -> FarmLocation 1: "Bada Khet" / "नहर के पास वाला खेत"
  -> FarmLocation 2: "Ghar ke Peeche" / "घर के पीछे वाला खेत"
  -> FarmLocation 3: "Aam Bagicha Wala Khet" / "आम के बाग के पास"
  -> Home / village location
```

### Farm location fields

| Field | Use |
| --- | --- |
| `id`, `customer_id` | Ownership and selection. |
| `local_name` | Farmer-facing name, e.g. `Bada Khet`. |
| `local_name_hindi` | Hindi/local-script name where supplied. |
| `aliases` | Spoken alternatives, e.g. `nahar wala`, `canal field`. |
| `location_type` | `FARM`, `HOME`, `VILLAGE_PICKUP`, or `SITE`. |
| `latitude`, `longitude` | Delivery navigation and distance calculation. |
| `village`, `tehsil`, `district`, `landmark` | Human-readable dispatch context. |
| `access_notes` | Narrow lane, canal bridge, field gate, tractor/trailer access. |
| `delivery_contact_name`, `delivery_contact_phone` | Person available to receive the equipment. |
| `is_default`, `last_used_at` | Faster repeat bookings. |
| `verified_at`, `verified_by` | Optional station/driver validation after first successful delivery. |

### Add a new farm in the smallest possible number of steps

1. Farmer selects **Add new farm**.
2. Farmer shares a WhatsApp location pin from the field gate or farm approach road.
3. Farmer sends a voice note or short text giving the local name: “इसे नहर वाला बड़ा खेत बोलते हैं।”
4. Bot transcribes the name, plays it back as text, and asks for confirmation.
5. Ask one operational question: “क्या ट्रॉली/ट्रैक्टर खेत तक पहुँच सकता है?”
6. Driver verifies/corrects access notes after the first delivery.

### Location-selection rules

- Always show the last-used and default farms first.
- Display the local name and landmark, not latitude/longitude.
- Let farmers reply with a number, a local name, or a voice note.
- Match spoken aliases cautiously and ask a confirmation question when there is more than one match.
- If the location is uncertain, present **Call me** rather than forcing the farmer to type an address.
- Store a booking-time location snapshot; later edits to a saved farm must not alter historic delivery records.

---

## 5. Task-Based Recommendation Instead of Machine-First Browsing

### Farmer task menu

Start with common local jobs and map each to equipment rules:

| Farmer says/chooses | Recommended equipment family | Extra question if needed |
| --- | --- | --- |
| जुताई / tilling | Tractor, rotavator, cultivator | Acreage and soil condition. |
| निराई / weeding | Power weeder | Crop row spacing / field size. |
| कटाई / harvesting | Reaper/harvester | Crop and acreage. |
| छिड़काव / spraying | Power sprayer | Crop type and acreage. |
| पानी निकालना / irrigation | Pump | Water source and pipe distance. |
| गड्ढा खोदना | Auger | Hole size/count and soil type. |

### Recommendation output

Show no more than two options at once:

```text
Best for your work: Power Weeder
For: 1–3 acres, weed removal between crop rows
Price today: ₹X machine + ₹Y delivery + refundable deposit ₹Z
[Book this] [See 10-sec video] [Talk to expert]
```

Do not begin with a long catalogue. Keep the catalogue available under **See all machines** for advanced users and staff.

---

## 6. Voice, Language, and Assisted Booking

### Voice-first requirements

- Accept Hindi, Hinglish, Bhojpuri and local variants through WhatsApp voice notes.
- Read back what was understood in a short confirmation message.
- Never fail a booking solely because transcription is uncertain; offer buttons and **Call me**.
- Keep replies short, with one question per message.

### Assisted channels

- Village dealer / FPO coordinator / CSC operator / EquipGrid Kisan Mitra can create or assist a booking.
- The helper must select the farmer and farm location, rather than retyping a full address.
- The farmer receives a WhatsApp/SMS confirmation even when a helper books on their behalf.
- Record `booking_source`: `WHATSAPP`, `PHONE_AGENT`, `DEALER`, `FPO`, `STATION`, or `WEBSITE`.

---

## 7. Booking, Payment, and Pricing Fixes

### Booking lifecycle changes

Introduce a customer-intent stage before a firm booking:

```text
REQUESTED
  -> NEEDS_CALLBACK (optional)
  -> QUOTED
  -> PAYMENT_PENDING
  -> CONFIRMED
  -> DISPATCH_SCHEDULED
  -> OUT_FOR_DELIVERY
  -> DELIVERED / ON_RENT
  -> RETURN_PICKUP_SCHEDULED
  -> RETURNED
  -> INSPECTED
  -> REFUND_PENDING
  -> CLOSED
```

`REQUESTED` should not lock a machine indefinitely. Set an explicit quote/hold expiry and release it automatically if not confirmed.

### Payment safety fixes — priority P0

- Do not mark a payment successful merely because the farmer writes `PAID` or sends a UTR-like number.
- Use a payment gateway/webhook or a staff-verified bank/UPI reconciliation workflow.
- Add idempotency keys and uniqueness checks for UTR/payment references.
- Separate `rent`, `delivery`, `operator`, `deposit`, `discount`, and `refund` ledger entries.
- Display the exact amount due and what is refundable in simple language.
- Support policy-controlled payment modes: UPI, cash at station, pay-at-delivery, dealer collection, or partial advance.

### Newly identified integration gap

The application can safely accept payment proof and create a refund work item, but it does not contain an authenticated payment-gateway integration or merchant payout credentials. Treat payment verification and refund payout as staff/provider actions until a provider webhook and payout API are configured. Do not restore automatic confirmation based only on a WhatsApp `PAID` message.

### Pricing fixes

- Calculate route distance from selected hub to selected `FarmLocation`; do not use a fixed 15 km distance.
- Recalculate when the hub, farm, date, machine, or operator changes.
- Quote with a single farmer-facing total and expandable breakdown.
- Clearly distinguish refundable deposit from rental charges.
- Add seasonal and village-cluster pricing rules only when the operator can explain them in simple language.

---

## 8. Dispatch and Delivery Improvements

### Internal operational flow

```text
Confirmed booking
  -> assign machine
  -> assign driver/vehicle/operator
  -> route and delivery slot
  -> pre-dispatch checklist
  -> out for delivery
  -> farmer/receiver confirms delivery
  -> on rent
```

### Required additions

- Create a delivery job from a confirmed booking, linked to farm location and navigation pin.
- Capture driver, vehicle, expected arrival window, and delivery contact.
- Send farmer a simple notification: “Your machine is leaving Hardoi yard. It will reach between 2–4 PM.”
- Let the driver record delivered/not-delivered/re-route reason and actual arrival point.
- Cluster deliveries by village/route to reduce transport cost and missed timing.
- Preserve the existing staff checklist, but make it a station/driver action only.

---

## 9. Return, Pickup, Inspection, and Refund Improvements

### Farmer return flow

```text
Farmer: "Return machine" or voice note
  -> choose [Today] [Tomorrow] [Call me]
  -> confirm saved farm/pickup point
  -> return pickup scheduled
  -> driver arrives and collects machine
  -> yard inspection
  -> refund initiated/completed
```

### Rules

- A return request must create a pickup job/slot, owner, and expected date—not only a chat state.
- Keep detailed damage inspection with driver/staff; for the farmer, ask only for optional photos or acknowledgement if there is a dispute.
- Record delivery and return photos against the booking for evidence.
- After inspection, initiate the actual refund through the selected payment/refund process or place it in a visible finance queue.
- Send an explicit result: full refund, deduction with reason/evidence, or refund pending with expected date.

---

## 10. Data Model and API Work

### New primary entities

- `FarmLocation`
- `FarmLocationAlias` (or aliases stored as JSON/text initially)
- `BookingLocationSnapshot`
- `DeliveryJob`
- `ReturnPickupJob`
- `PaymentVerification`
- `RefundTransaction`
- `EquipmentRecommendationRule`

### Existing entities to extend

| Entity | Required change |
| --- | --- |
| `Customer` | Keep home/contact data; link to multiple `FarmLocation` records. |
| `Booking` | Link to selected farm, location snapshot, source, simplified customer status, callback preference, delivery/pickup jobs. |
| `DispatchRecord` | Link to delivery job; capture expected/actual arrival and receiver confirmation. |
| `ReturnInspection` | Link to pickup job and eventual refund record. |
| `Payment` | Add verification state, gateway reference, idempotency key, and clear ledger category. |

### Core APIs

```text
GET    /customers/{id}/farm-locations
POST   /customers/{id}/farm-locations
PATCH  /farm-locations/{id}
POST   /farm-locations/{id}/aliases
POST   /recommendations/equipment
POST   /booking-requests
POST   /bookings/{id}/confirm
POST   /bookings/{id}/payment-intents
POST   /payment-webhooks/provider
POST   /bookings/{id}/delivery-jobs
POST   /bookings/{id}/return-pickups
POST   /bookings/{id}/refunds
```

---

## 11. Station Portal Changes

### Booking desk

- Search farmer by mobile number first.
- Display saved farm cards with local name, landmark, last-used date and access warning.
- Add **Create via phone/voice request** and **Needs callback** actions.
- Make task/crop the first optional selection; use it to recommend machines.
- Show a farmer-facing summary before confirmation.

### Dispatch yard

- Use delivery-job queue rather than only booking status.
- Group jobs by hub, route, village and promised time slot.
- Show farm local name prominently with navigation, access notes and receiver contact.
- Add `OUT_FOR_DELIVERY` and `DELIVERED` recording.

### Return audit

- Show scheduled pickup queue separately from machines already returned to yard.
- Require pickup completion before final return inspection.
- Add a visible refund state and finance handoff.

---

## 12. Phased Delivery Plan

### Phase 0 — Correctness and trust (first)

- Replace self-declared WhatsApp payment confirmation with verified payment handling.
- Stop claiming an instant refund until an actual refund workflow exists.
- Fix route-distance pricing from the selected farm location.
- Add explicit return pickup jobs and operational ownership.

### Phase 1 — Multiple farms and simple repeat booking

- Introduce `FarmLocation` with local names, aliases, pin, landmark and access notes.
- Let users choose a saved farm, add a new farm by pin + voice name, or request a call.
- Link bookings to immutable location snapshots.
- Add `Book again` using last task, machine and farm.

### Phase 2 — Farmer-first request and recommendation

- Add task/crop/acreage intake.
- Build equipment recommendation rules and show at most two suitable options.
- Add Today/Tomorrow/Choose Date and callback preference.
- Simplify customer messages and status labels.

### Phase 3 — Delivery and return operations

- Add delivery and return pickup queues, driver assignment and ETAs.
- Record field delivery confirmation and evidence.
- Integrate refund initiation and farmer notification.
- Add village-route clustering and capacity planning.

### Phase 4 — Local helper network and learning

- Add role-aware assisted booking for dealers/FPOs/CSC/Kisan Mitras.
- Measure completion, cancellation, failed delivery, payment, return and repeat-booking rates by village and task.
- Improve local-language aliases and recommendation rules from actual usage.

---

## 13. Acceptance Criteria

### Farmer experience

- A repeat farmer can request a machine for a saved farm in four or fewer interactions.
- A new farmer can add a farm using a location pin and voice/text local name without typing a full address.
- The farmer can select a farm using its local name, Hindi name, alias, number, or voice note.
- Every farmer sees only customer-friendly statuses.
- Every request has a clear self-service or callback path.

### Operations and finance

- Every confirmed booking has a verified payment state or an explicitly approved alternative payment policy.
- No payment can be recorded twice from the same provider reference/UTR.
- Every delivery has a driver/owner, farm pin, access notes and promised time window.
- Every return request produces a pickup job.
- Every completed inspection has a visible refund action/status.
- Historic bookings retain the original delivery location snapshot.

---

## 14. Measures of Success

- Booking-request completion rate.
- Percentage of bookings completed through voice/buttons without staff data entry.
- Repeat booking rate using saved farms.
- Delivery first-attempt success rate.
- Quote-to-confirmation conversion rate.
- Payment verification failure/duplicate rate.
- Return pickup completion time.
- Refund completion time.
- Farmer support-call rate by flow step and language.

---

## Decision Summary

Build the customer experience around **task + time + named farm location**, not catalogue + formal address. A farmer should say or tap what work is needed and where: “reaper tomorrow at the canal-side field.” EquipGrid should translate that into the correct machine, a verified price, a delivery job, and a reliable return/refund workflow.
