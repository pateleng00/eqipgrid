package com.equipgrid.whatsapp.service;

import com.equipgrid.whatsapp.dto.request.WhatsAppNotificationRequest;
import com.equipgrid.whatsapp.dto.response.WhatsAppMessageResponse;

public interface IWhatsAppNotificationService {

    /**
     * Send proactive WhatsApp notification (e.g. Booking Confirmed, Dispatch Alert, Payment Reminder, Return Refunded).
     */
    WhatsAppMessageResponse sendNotification(WhatsAppNotificationRequest request);

    /**
     * Notify customer on booking creation with UPI payment QR.
     */
    WhatsAppMessageResponse notifyBookingCreated(Long bookingId);

    /**
     * Notify customer when machine is dispatched to farm with driver and vehicle info.
     */
    WhatsAppMessageResponse notifyDispatchIssued(Long bookingId);

    /**
     * Notify customer on return inspection completion and security deposit refund.
     */
    WhatsAppMessageResponse notifyReturnSettlement(Long bookingId);
}
