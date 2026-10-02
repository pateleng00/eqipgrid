package com.equipgrid.whatsapp.service;

import com.equipgrid.booking.entity.Booking;
import com.equipgrid.booking.repository.BookingQueryRepository;
import com.equipgrid.dispatch.entity.DispatchRecord;
import com.equipgrid.dispatch.repository.DispatchQueryRepository;
import com.equipgrid.returninspection.dto.response.SettlementCalculationResponse;
import com.equipgrid.returninspection.service.IReturnInspectionService;
import com.equipgrid.whatsapp.dto.model.UpiPaymentDetails;
import com.equipgrid.whatsapp.dto.request.WhatsAppNotificationRequest;
import com.equipgrid.whatsapp.dto.response.WhatsAppMessageResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class WhatsAppNotificationServiceImpl implements IWhatsAppNotificationService {

    private final BookingQueryRepository bookingQueryRepository;
    private final DispatchQueryRepository dispatchQueryRepository;
    private final IReturnInspectionService returnInspectionService;
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

        UpiPaymentDetails upi = upiQrGeneratorService.buildUpiPaymentDetails(
                booking.getBookingNumber(),
                booking.getTotalAmount(),
                "Advance & Deposit for " + booking.getBookingNumber()
        );

        String message = String.format("""
                🌾 *EquipGrid Booking Alert* 🚜
                ━━━━━━━━━━━━━━━━━━━━━━
                Dear %s,
                Your machinery booking *%s* is confirmed!
                
                🚜 Machine: *%s* (`%s`)
                📅 Dates: *%s to %s*
                📍 Delivery Address: *%s*
                
                💰 Total Advance Due: *₹%,.2f*
                _(Includes ₹%,.2f 100%% Refundable Security Deposit)_
                
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
                booking.getTotalAmount(),
                booking.getDepositAmount(),
                upi.getUpiUri()
        );

        log.info("Sent booking created notification via WhatsApp to phone: {}", booking.getCustomer().getPhone());

        return WhatsAppMessageResponse.builder()
                .to(booking.getCustomer().getPhone())
                .message(message)
                .bookingNumber(booking.getBookingNumber())
                .upiPayment(upi)
                .suggestedOptions(List.of("PAID", "MENU"))
                .build();
    }

    @Override
    public WhatsAppMessageResponse notifyDispatchIssued(Long bookingId) {
        Booking booking = bookingQueryRepository.fetchById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));

        DispatchRecord dispatch = dispatchQueryRepository.fetchByBookingId(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Dispatch record not found for booking: " + bookingId));

        String message = String.format("""
                🚚 *Machinery Dispatched to Your Farm!* 🚜
                ━━━━━━━━━━━━━━━━━━━━━━
                Dear %s,
                Your rented machine is on the way to your farm!
                
                📄 Challan No: *%s*
                🚜 Equipment: *%s*
                👨‍✈️ Driver: *%s*
                ⛽ Dispatch Fuel Level: *%s*
                
                📍 Destination: %s
                
                Please have your farm space ready for unloading.
                Reply *3* or *TRACK* anytime to check trip status.
                """,
                booking.getCustomer().getFullName(),
                dispatch.getChallanNumber(),
                booking.getAsset().getName(),
                dispatch.getDriverName() != null ? dispatch.getDriverName() : "EquipGrid Driver",
                dispatch.getFuelLevel() != null ? dispatch.getFuelLevel() : "100%",
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

        SettlementCalculationResponse settlement = returnInspectionService.calculateDepositSettlement(bookingId);

        String message = String.format("""
                ✅ *Return Inspection & Refund Processed!* 🌾
                ━━━━━━━━━━━━━━━━━━━━━━
                Dear %s,
                Your rented machine *%s* has been received and inspected at our hub yard.
                
                📊 *Deposit Settlement Breakdown:*
                • Security Deposit Held: ₹%,.2f
                • Fuel Surcharge: ₹%,.2f
                • Damage Deductions: ₹%,.2f
                ━━━━━━━━━━━━━━━━━━━━━━
                💰 *Net Refund Credited to UPI*: *₹%,.2f*
                
                The refund has been initiated to your UPI linked mobile number (%s).
                Thank you for using EquipGrid!
                """,
                booking.getCustomer().getFullName(),
                booking.getAsset().getName(),
                settlement.getOriginalDeposit(),
                settlement.getFuelDeltaDeduction(),
                settlement.getDamageDeduction(),
                settlement.getNetDepositRefundable(),
                booking.getCustomer().getPhone()
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
