package com.equipgrid.whatsapp.service;

import com.equipgrid.whatsapp.dto.request.WhatsAppInboundRequest;
import com.equipgrid.whatsapp.dto.response.WhatsAppMessageResponse;
import com.equipgrid.whatsapp.entity.WhatsAppConversation;

import java.util.List;
import java.util.Optional;

public interface IWhatsAppBotService {

    /**
     * Process an incoming WhatsApp message and return the conversational response with options & UPI QR if needed.
     */
    WhatsAppMessageResponse processIncomingMessage(WhatsAppInboundRequest request);

    /**
     * Reset the conversation session for a given mobile number.
     */
    void resetConversation(String phoneNumber);

    /**
     * Get all active WhatsApp conversation sessions for station panel monitoring.
     */
    List<WhatsAppConversation> getAllConversations();

    /**
     * Get conversation session by customer phone number.
     */
    Optional<WhatsAppConversation> getConversationByPhone(String phoneNumber);

    /**
     * Get list of equipment formatted for WhatsApp catalog with S3 photos, videos, and hub details.
     */
    List<WhatsAppMessageResponse> getCatalog(Long hubId);
}
