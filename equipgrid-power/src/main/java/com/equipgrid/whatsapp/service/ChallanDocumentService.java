package com.equipgrid.whatsapp.service;

import com.equipgrid.booking.entity.Booking;
import com.equipgrid.dispatch.entity.DispatchRecord;
import com.equipgrid.returninspection.entity.ReturnInspection;
import com.equipgrid.whatsapp.service.IUpiQrGeneratorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.List;

/**
 * Service responsible for generating digital delivery challans and damage checklists
 * as structured text documents (WhatsApp-friendly formatted strings) and
 * HTML representations suitable for PDF rendering or display.
 *
 * <p>Documents generated:
 * <ul>
 *   <li><b>Outward Delivery Challan (DC)</b>: Issued when machine dispatched from yard</li>
 *   <li><b>Inward Return Challan (RC)</b>: Issued when machine picked up from site</li>
 *   <li><b>Damage Inspection Checklist</b>: Interactive step-by-step WhatsApp checklist</li>
 *   <li><b>Settlement Statement</b>: Final UPI refund settlement document</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChallanDocumentService {

    private final IUpiQrGeneratorService upiQrGeneratorService;

    // ═══════════════════════════════════════════════════════════════════════════
    // OUTWARD DELIVERY CHALLAN — sent via WhatsApp when machine dispatched
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Builds a structured WhatsApp-formatted outward delivery challan text.
     * This is the primary "Handover Document" sent to the customer.
     */
    public String buildOutwardChallanWhatsAppText(Booking booking, DispatchRecord dispatch) {
        String challanNo   = dispatch.getChallanNumber();
        String bookingNo   = booking.getBookingNumber();
        String machineName = booking.getAsset().getName();
        String machineTag  = booking.getAsset().getAssetTag();
        String customer    = booking.getCustomer().getFullName();
        String phone       = booking.getCustomer().getPhone();
        String delivery    = booking.getDeliveryAddress();
        String driver      = dispatch.getDriverName() != null ? dispatch.getDriverName() : "EquipGrid Logistics";
        String fuel        = dispatch.getFuelLevel() != null ? dispatch.getFuelLevel() : "100%";
        String hours       = dispatch.getEngineHoursOut() != null ? dispatch.getEngineHoursOut().toPlainString() : "0.00";
        String timestamp   = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy HH:mm"));
        boolean accessories = Boolean.TRUE.equals(dispatch.getAccessoriesVerified());

        // Resolve hub and city
        String hub  = booking.getAsset().getHub() != null ? booking.getAsset().getHub().getName() : "Central Hub";
        String city = booking.getAsset().getHub() != null && booking.getAsset().getHub().getCity() != null
                ? booking.getAsset().getHub().getCity().getName() : "Uttar Pradesh";

        return """
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                🚜 *EquipGrid — Outward Delivery Challan*
                *(डिलीवरी चालान / Handover Document)*
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                📄 *Challan No:* %s
                📋 *Booking Ref:* %s
                🗓️ *Dispatch Date & Time:* %s
                
                *──────── Customer Details ────────*
                👤 Customer: *%s*
                📱 Mobile: *%s*
                
                *──────── Equipment Details ────────*
                🚜 Machine: *%s* (`%s`)
                🏢 Dispatched From: *%s* (%s)
                ⛽ Fuel Level at Dispatch: *%s*
                ⏱️ Engine Hours (Out): *%s hrs*
                🧰 Accessories Pack: *%s*
                
                *──────── Delivery Site ────────*
                📍 Destination: *%s*
                
                *──────── Logistics ────────*
                🚗 Driver / Transporter: *%s*
                
                *──────── Rental Terms ────────*
                📅 From: *%s*
                📅 To:   *%s*
                💰 Daily Rent: ₹%,.0f/day
                🛡️ Security Deposit: ₹%,.0f (Held in Escrow)
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                ✅ *Pre-dispatch 28-point inspection verified.*
                *Customer to confirm receipt by replying:* *GOT IT* or *MILI*
                
                _EquipGrid — Grameen Yantrik Seva | Hardoi | Lucknow | Kanpur_
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                """.formatted(
                challanNo, bookingNo, timestamp,
                customer, phone,
                machineName, machineTag, hub, city,
                fuel, hours,
                accessories ? "✅ Verified & Complete" : "⚠️ Partially Verified",
                delivery,
                driver,
                booking.getStartDate(), booking.getEndDate(),
                booking.getAsset().getDailyRate() != null ? booking.getAsset().getDailyRate() : BigDecimal.ZERO,
                booking.getDepositAmount() != null ? booking.getDepositAmount() : BigDecimal.ZERO
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DAMAGE CHECKLIST — interactive return inspection via WhatsApp
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Returns the ordered list of damage checklist items for a given category.
     * Each string is the display label for the checklist point.
     */
    public List<ChecklistItem> getDamageChecklist(String assetCategory) {
        if ("AGRICULTURE".equalsIgnoreCase(assetCategory)) {
            return List.of(
                    new ChecklistItem("FUEL_LEVEL",       "⛽ Fuel Level",       "Is the fuel level same as when dispatched?"),
                    new ChecklistItem("ENGINE_CONDITION",  "🔧 Engine / Motor",   "Engine starts normally and runs without issues?"),
                    new ChecklistItem("BLADES_CUTTERS",   "⚙️ Blades / Cutters", "All blades/cutters intact, not broken or bent?"),
                    new ChecklistItem("BODY_FRAME",       "🛡️ Body & Frame",     "No major dents, cracks, or broken parts on body?"),
                    new ChecklistItem("ACCESSORIES",      "🧰 Accessories",      "All standard accessories present (as per challan)?"),
                    new ChecklistItem("CLEANING",         "🧹 Cleanliness",      "Machine drum/body cleaned of mud/crop residue?"),
                    new ChecklistItem("TYRES_WHEELS",     "🔘 Tyres / Wheels",   "Tyres intact, no punctures or missing wheels?"),
                    new ChecklistItem("SAFETY_GUARD",     "🦺 Safety Guards",    "All protective safety guards in place?")
            );
        } else {
            // CONSTRUCTION
            return List.of(
                    new ChecklistItem("FUEL_LEVEL",       "⛽ Fuel Level",       "Is the fuel level same as when dispatched?"),
                    new ChecklistItem("ENGINE_CONDITION",  "🔧 Engine / Motor",   "Engine/motor starts and runs without issues?"),
                    new ChecklistItem("DRUM_BARREL",      "🥁 Drum / Barrel",    "Drum/barrel clean, no concrete buildup?"),
                    new ChecklistItem("VIBRATOR_NEEDLE",  "📳 Vibrator Needle",  "Vibrator needle/poker intact and functional?"),
                    new ChecklistItem("HOSES_CABLES",     "🔌 Hoses & Cables",   "All hoses and cables present and undamaged?"),
                    new ChecklistItem("BODY_FRAME",       "🛡️ Body & Frame",     "No major dents, cracks on main body/frame?"),
                    new ChecklistItem("ACCESSORIES",      "🧰 Accessories",      "All accessories present (as per dispatch challan)?"),
                    new ChecklistItem("CLEANLINESS",      "🧹 Cleanliness",      "Machine cleaned of concrete/mortar residue?")
            );
        }
    }

    /**
     * Generates the WhatsApp text for a single checklist step prompt.
     */
    public String buildChecklistItemPrompt(ChecklistItem item, int currentIdx, int totalItems,
                                            String machineName, String bookingNo) {
        return """
                📋 *Return Inspection Checklist — Item %d of %d*
                ━━━━━━━━━━━━━━━━━━━━━━
                🚜 Machine: *%s* | Ref: *%s*
                
                %s *%s*
                _%s_
                
                👉 *Reply with:*
                ✅ *OK* — Item is fine, no damage
                ❌ *DAMAGED* — Item has damage / issue
                ⚠️ *MISSING* — Item is missing/lost
                📷 *Photo DAMAGED* — Send a photo of the damage
                
                _(or type *SKIP* to move to next item)_
                """.formatted(
                currentIdx + 1, totalItems,
                machineName, bookingNo,
                item.icon(), item.label(), item.prompt()
        );
    }

    /**
     * Builds the completion summary after all checklist items processed.
     */
    public String buildChecklistCompletionSummary(Booking booking, List<ChecklistItem> items,
                                                   java.util.Map<String, String> statuses,
                                                   java.util.Map<String, String> photos) {
        StringBuilder sb = new StringBuilder();
        sb.append("✅ *Return Inspection Checklist — Complete*\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━━━\n");
        sb.append(String.format("🚜 Machine: *%s* (`%s`)\n", booking.getAsset().getName(), booking.getAsset().getAssetTag()));
        sb.append(String.format("📋 Booking: *%s*\n\n", booking.getBookingNumber()));
        sb.append("*── Inspection Summary ──*\n");

        int okCount = 0, damageCount = 0, missingCount = 0;
        for (ChecklistItem item : items) {
            String status = statuses.getOrDefault(item.key(), "OK");
            String icon   = switch (status) {
                case "DAMAGED"  -> "❌";
                case "MISSING"  -> "⚠️";
                default         -> "✅";
            };
            sb.append(String.format("%s %s %s\n", icon, item.icon(), item.label()));
            if (photos.containsKey(item.key())) {
                sb.append("   📷 Photo submitted\n");
            }
            if ("DAMAGED".equals(status)) damageCount++;
            else if ("MISSING".equals(status)) missingCount++;
            else okCount++;
        }

        sb.append("\n━━━━━━━━━━━━━━━━━━━━━━\n");
        sb.append(String.format("✅ OK: %d | ❌ Damaged: %d | ⚠️ Missing: %d\n\n", okCount, damageCount, missingCount));

        if (damageCount == 0 && missingCount == 0) {
            sb.append("""
                    🎉 *Machine returned in good condition!*
                    Your security deposit refund will be initiated immediately.
                    
                    💳 *Full Deposit Refund: 100%* ✅
                    """);
        } else {
            sb.append(String.format("""
                    ⚠️ *Inspection noted %d issue(s)*
                    Our yard team will review photos and calculate any deductions.
                    You will receive a final settlement statement within *2 hours*.
                    
                    💳 Deposit refund (after deductions) will be credited to your UPI.
                    """, damageCount + missingCount));
        }

        sb.append("\n_Thank you for using EquipGrid Rentals!_ 🌾");
        return sb.toString();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INWARD RETURN CHALLAN — sent to customer when machine picked up
    // ═══════════════════════════════════════════════════════════════════════════

    public String buildInwardReturnChallanWhatsAppText(Booking booking,
                                                        List<ChecklistItem> items,
                                                        java.util.Map<String, String> statuses) {
        String bookingNo   = booking.getBookingNumber();
        String machineName = booking.getAsset().getName();
        String machineTag  = booking.getAsset().getAssetTag();
        String customer    = booking.getCustomer().getFullName();
        String timestamp   = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy HH:mm"));

        long okCount      = statuses.values().stream().filter("OK"::equals).count();
        long damageCount  = statuses.values().stream().filter("DAMAGED"::equals).count();
        long missingCount = statuses.values().stream().filter("MISSING"::equals).count();

        return """
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                🔄 *EquipGrid — Return (Inward) Challan*
                *(वापसी / मशीन रिटर्न चालान)*
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                📋 *Booking Ref:* %s
                🗓️ *Return Date & Time:* %s
                
                👤 Customer: *%s*
                🚜 Machine: *%s* (`%s`)
                
                *──────── Inspection Results ────────*
                ✅ Items OK: *%d*
                ❌ Damaged: *%d*
                ⚠️ Missing: *%d*
                
                ✅ Return pickup acknowledged.
                Our yard team will complete the full inspection and
                process your deposit refund within *2 hours*.
                
                _EquipGrid — Grameen Yantrik Seva_
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                """.formatted(
                bookingNo, timestamp,
                customer, machineName, machineTag,
                okCount, damageCount, missingCount
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DEPOSIT SETTLEMENT STATEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    public String buildSettlementStatementText(Booking booking, BigDecimal depositPaid,
                                                BigDecimal damageDeduction, BigDecimal fuelDeduction,
                                                BigDecimal netRefund, String upiRef) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy HH:mm"));
        return """
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                💰 *EquipGrid — Security Deposit Settlement*
                *(जमानत राशि वापसी विवरण)*
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                📋 Booking: *%s*
                🗓️ Settled On: *%s*
                👤 Customer: *%s*
                🚜 Machine: *%s* (`%s`)
                
                *──────── Settlement Breakdown ────────*
                🛡️ Total Security Deposit Held: *₹%,.2f*
                ⛽ Fuel Surcharge Deducted:     -₹%,.2f
                🔧 Damage / Repair Deducted:   -₹%,.2f
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                💳 *Net Refund Credited: ₹%,.2f* ✅
                
                📲 Refund sent to UPI: *%s*
                🔗 Reference ID: *%s*
                
                _100%% Refundable Guarantee — EquipGrid Zero-Credit Policy_
                _EquipGrid | Hardoi | Lucknow | Kanpur_
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                """.formatted(
                booking.getBookingNumber(), timestamp,
                booking.getCustomer().getFullName(),
                booking.getAsset().getName(), booking.getAsset().getAssetTag(),
                depositPaid, fuelDeduction, damageDeduction, netRefund,
                booking.getCustomer().getPhone(), upiRef
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Supporting record types
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Represents a single damage checklist inspection point.
     *
     * @param key    Machine-readable key (e.g. "FUEL_LEVEL")
     * @param label  Short display label (e.g. "Fuel Level")
     * @param prompt Question shown to customer
     */
    public record ChecklistItem(String key, String label, String prompt) {
        /** Emoji icon prefix derived from the label */
        public String icon() {
            if (label.startsWith("⛽")) return "⛽";
            if (label.startsWith("🔧")) return "🔧";
            if (label.startsWith("⚙️")) return "⚙️";
            if (label.startsWith("🛡️")) return "🛡️";
            if (label.startsWith("🧰")) return "🧰";
            if (label.startsWith("🧹")) return "🧹";
            if (label.startsWith("🔘")) return "🔘";
            if (label.startsWith("🦺")) return "🦺";
            if (label.startsWith("🥁")) return "🥁";
            if (label.startsWith("📳")) return "📳";
            if (label.startsWith("🔌")) return "🔌";
            if (label.startsWith("📷")) return "📷";
            return "📋";
        }
    }
}
