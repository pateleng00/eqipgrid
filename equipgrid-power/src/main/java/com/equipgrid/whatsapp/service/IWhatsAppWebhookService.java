package com.equipgrid.whatsapp.service;

import com.equipgrid.whatsapp.dto.response.WhatsAppMessageResponse;
import java.math.BigDecimal;
import java.util.Map;

public interface IWhatsAppWebhookService {

  boolean verifyWebhookChallenge(String mode, String token);

  WhatsAppMessageResponse processJsonWebhook(String signatureHeader, String rawPayload);

  WhatsAppMessageResponse processTwilioWebhook(Map<String, String> formParams);

  byte[] generateBookingQrCodeImage(String bookingNumber);

  byte[] generateMerchantQrCodeImage(BigDecimal amount, String note);
}
