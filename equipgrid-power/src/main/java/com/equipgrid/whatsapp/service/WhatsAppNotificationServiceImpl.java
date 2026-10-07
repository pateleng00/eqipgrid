package com.equipgrid.whatsapp.service;

import com.equipgrid.booking.entity.Booking;
import com.equipgrid.booking.repository.BookingQueryRepository;
import com.equipgrid.dispatch.entity.DispatchRecord;
import com.equipgrid.dispatch.repository.DispatchQueryRepository;
import com.equipgrid.returninspection.entity.ReturnInspection;
import com.equipgrid.returninspection.repository.ReturnInspectionQueryRepository;
import com.equipgrid.whatsapp.dto.model.UpiPaymentDetails;
import com.equipgrid.whatsapp.dto.request.WhatsAppNotificationRequest;
import com.equipgrid.whatsapp.dto.response.WhatsAppMessageResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class WhatsAppNotificationServiceImpl implements IWhatsAppNotificationService {

    private final BookingQueryRepository bookingQueryRepository;
    private final DispatchQueryRepository dispatchQueryRepository;
    private final ReturnInspectionQueryRepository returnInspectionQueryRepository;
    private final IUpiQrGeneratorService upiQrGeneratorService;

    @Override
    public WhatsAppMessageResponse sendNotification(WhatsAppNotificationRequest request) {
        log.info("Sending outbound WhatsApp alert to: {}, type: {}", request.getPhoneNumber(), request.getNotificationType());

        return WhatsAppMessageResponse.builder()
                .to(request.getPhoneNumber())
                .message(request.getCustomMessage() != null ? request.getCustomMessage() : "Alert from EquipGrid Rentals")
                .bookingNumber(request.getBookingNumber())
                .build();
    }

    @Override
    public WhatsAppMessageResponse notifyBookingCreated(Long bookingId) {
        Booking booking = bookingQueryRepository.fetchById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));

        BigDecimal advancePaid = booking.getAdvancePaid() != null ? booking.getAdvancePaid() : BigDecimal.ZERO;
        BigDecimal depositPaid = booking.getDepositPaid() != null ? booking.getDepositPaid() : BigDecimal.ZERO;
        BigDecimal totalPaid = advancePaid.add(depositPaid);

        BigDecimal requiredBarrier = (booking.getDepositAmount() != null ? booking.getDepositAmount() : BigDecimal.ZERO)
                .add(booking.getBaseRent() != null ? booking.getBaseRent() : BigDecimal.ZERO);
        boolean isPaymentConfirmed = totalPaid.compareTo(BigDecimal.ZERO) > 0 && totalPaid.compareTo(requiredBarrier) >= 0;

        String message;
        UpiPaymentDetails upi = null;

        if (isPaymentConfirmed) {
            message = String.format("""
                    🌾 *EquipGrid Booking & Payment Confirmed* 🚜
                    ━━━━━━━━━━━━━━━━━━━━━━
                    Dear %s,
                    Your machinery reservation *%s* is confirmed and payment is verified!
                    
                    🚜 Machine: *%s* (`%s`)
                    📅 Rental Dates: *%s to %s*
                    📍 Delivery Address: *%s*
                    
                    💳 *Payment Confirmation Breakdown:*
                    • Advance Rent: *₹%,.2f* (Paid)
                    • Security Deposit: *₹%,.2f* (Paid - 100%% Refundable Escrow)
                    ━━━━━━━━━━━━━━━━━━━━━━
                    💰 Total Amount Paid: *₹%,.2f*
                    ✅ Status: *DISPATCH READY*
                    
                    📄 *Attached Documents:*
                    • Booking Confirmation Receipt: *VCR-%s*
                    • Printable Digital Voucher & Yard Handover Pass attached.
                    
                    Our yard operations team is inspecting and staging the machine. You will receive a dispatch alert with driver and vehicle details as soon as it leaves the yard.
                    """,
                    booking.getCustomer().getFullName(),
                    booking.getBookingNumber(),
                    booking.getAsset().getName(),
                    booking.getAsset().getAssetTag(),
                    booking.getStartDate(),
                    booking.getEndDate(),
                    booking.getDeliveryAddress(),
                    advancePaid,
                    depositPaid,
                    totalPaid,
                    booking.getBookingNumber()
            );
        } else {
            upi = upiQrGeneratorService.buildUpiPaymentDetails(
                    booking.getBookingNumber(),
                    booking.getTotalAmount(),
                    "Advance & Deposit for " + booking.getBookingNumber()
            );

            message = String.format("""
                    🌾 *EquipGrid Booking Reservation* 🚜
                    ━━━━━━━━━━━━━━━━━━━━━━
                    Dear %s,
                    Your machinery reservation *%s* has been received!
                    
                    🚜 Machine: *%s* (`%s`)
                    📅 Dates: *%s to %s*
                    📍 Delivery Address: *%s*
                    
                    💰 Initial Collection Due: *₹%,.2f*
                    _(Advance Rent: ₹%,.2f + 100%% Refundable Security Deposit: ₹%,.2f)_
                    
                    📲 *Pay via UPI QR Code:*
                    %s
                    
                    Scan with PhonePe / Google Pay / Paytm to confirm dispatch.
                    """,
                    booking.getCustomer().getFullName(),
                    booking.getBookingNumber(),
                    booking.getAsset().getName(),
                    booking.getAsset().getAssetTag(),
                    booking.getStartDate(),
                    booking.getEndDate(),
                    booking.getDeliveryAddress(),
                    requiredBarrier,
                    booking.getBaseRent() != null ? booking.getBaseRent() : BigDecimal.ZERO,
                    booking.getDepositAmount() != null ? booking.getDepositAmount() : BigDecimal.ZERO,
                    upi.getUpiUri()
            );
        }

        log.info("Sent booking notification via WhatsApp to phone: {} (paymentConfirmed={})",
                booking.getCustomer().getPhone(), isPaymentConfirmed);

        return WhatsAppMessageResponse.builder()
                .to(booking.getCustomer().getPhone())
                .message(message)
                .bookingNumber(booking.getBookingNumber())
                .upiPayment(upi)
                .suggestedOptions(isPaymentConfirmed ? List.of("STATUS", "MENU") : List.of("PAID", "MENU"))
                .build();
    }

    @Override
    public WhatsAppMessageResponse notifyDispatchIssued(Long bookingId) {
        Booking booking = bookingQueryRepository.fetchById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));

        DispatchRecord dispatch = dispatchQueryRepository.fetchByBookingId(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Dispatch record not found for booking: " + bookingId));

        String message = String.format("""
                🚚 *Machinery Dispatched from Yard!* 🚜
                ━━━━━━━━━━━━━━━━━━━━━━
                Dear %s,
                Your rented machine is dispatched from our yard and is en route to your site!
                
                📄 Challan No: *%s*
                🔖 Booking Ref: *%s*
                🚜 Equipment: *%s* (`%s`)
                👨‍✈️ Driver / Transporter: *%s*
                ⛽ Outgoing Fuel: *%s*
                ⏱ Meter Reading: *%.1f hrs*
                📍 Site Destination: *%s*
                
                ✅ Pre-dispatch 28-point inspection & accessories verified.
                Handover Delivery Challan (DC) is active.
                
                Please ensure the unloading site and operator are ready.
                Reply *TRACK* or *3* anytime to check live delivery trip status.
                """,
                booking.getCustomer().getFullName(),
                dispatch.getChallanNumber(),
                booking.getBookingNumber(),
                booking.getAsset().getName(),
                booking.getAsset().getAssetTag(),
                dispatch.getDriverName() != null ? dispatch.getDriverName() : "EquipGrid Logistics",
                dispatch.getFuelLevel() != null ? dispatch.getFuelLevel() : "100%",
                dispatch.getEngineHoursOut() != null ? dispatch.getEngineHoursOut() : 0.0,
                booking.getDeliveryAddress()
        );

        log.info("Sent dispatch notification via WhatsApp to phone: {}", booking.getCustomer().getPhone());

        return WhatsAppMessageResponse.builder()
                .to(booking.getCustomer().getPhone())
                .message(message)
                .bookingNumber(booking.getBookingNumber())
                .suggestedOptions(List.of("TRACK", "MENU"))
                .build();
    }

    @Override
    public WhatsAppMessageResponse notifyReturnSettlement(Long bookingId) {
        Booking booking = bookingQueryRepository.fetchById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));

        List<ReturnInspection> list = returnInspectionQueryRepository.fetchByBookingId(bookingId);
        BigDecimal damage = BigDecimal.ZERO;
        BigDecimal fuelDelta = BigDecimal.ZERO;
        String conditionNotes = "Machine received in good working condition.";

        if (!list.isEmpty()) {
            ReturnInspection last = list.get(list.size() - 1);
            if (last.getDamageCost() != null) damage = last.getDamageCost();
            if (last.getFuelDeltaCharge() != null) fuelDelta = last.getFuelDeltaCharge();
            if (last.getDamageDescription() != null && !last.getDamageDescription().isBlank()) {
                conditionNotes = last.getDamageDescription();
            }
        }

        BigDecimal depositPaid = booking.getDepositPaid() != null ? booking.getDepositPaid() : BigDecimal.ZERO;
        BigDecimal netRefund = depositPaid.subtract(damage).subtract(fuelDelta);
        if (netRefund.compareTo(BigDecimal.ZERO) < 0) {
            netRefund = BigDecimal.ZERO;
        }

        String message = String.format("""
                ✅ *Return Inspection & Deposit Settlement Completed!* 🌾
                ━━━━━━━━━━━━━━━━━━━━━━
                Dear %s,
                Your rented machinery *%s* (`%s`) has completed return yard inspection.
                
                📋 Booking Ref: *%s*
                🔍 Inspection Audit: %s
                
                📊 *Security Deposit Settlement Statement:*
                • Original Deposit Held: *₹%,.2f*
                • Fuel Surcharge: -₹%,.2f
                • Damage / Repair Deductions: -₹%,.2f
                ━━━━━━━━━━━━━━━━━━━━━━
                💰 *Net Refund to Customer: ₹%,.2f*
                
                🏦 Refund Status: *INITIATED / CREDITED*
                Destination: Registered UPI number (%s)
                Voucher Reference: *F-004-SET-%s*
                
                Thank you for choosing EquipGrid! We look forward to serving your next project.
                """,
                booking.getCustomer().getFullName(),
                booking.getAsset().getName(),
                booking.getAsset().getAssetTag(),
                booking.getBookingNumber(),
                conditionNotes,
                depositPaid,
                fuelDelta,
                damage,
                netRefund,
                booking.getCustomer().getPhone(),
                booking.getBookingNumber()
        );

        log.info("Sent return settlement notification via WhatsApp to phone: {}", booking.getCustomer().getPhone());

        return WhatsAppMessageResponse.builder()
                .to(booking.getCustomer().getPhone())
                .message(message)
                .bookingNumber(booking.getBookingNumber())
                .suggestedOptions(List.of("1. Rent Again", "MENU"))
                .build();
    }
}
