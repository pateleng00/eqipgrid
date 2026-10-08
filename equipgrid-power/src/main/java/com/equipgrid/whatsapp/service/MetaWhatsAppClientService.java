package com.equipgrid.whatsapp.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
public class MetaWhatsAppClientService {

    @Value("${equipgrid.whatsapp.meta.phone-number-id:1450975934758555}")
    private String phoneNumberId;

    @Value("${equipgrid.whatsapp.meta.access-token:}")
    private String accessToken;

    @Value("${equipgrid.whatsapp.meta.api-version:v21.0}")
    private String apiVersion;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Dispatches a free-form text message via Meta WhatsApp Cloud API.
     */
    public boolean sendTextMessage(String recipientPhone, String text) {
        if (accessToken == null || accessToken.isBlank() || phoneNumberId == null || phoneNumberId.isBlank()) {
            log.warn("[Meta WhatsApp] Credentials not configured. Skipping message to: {}", recipientPhone);
            return false;
        }

        if (recipientPhone == null || recipientPhone.isBlank() || text == null || text.isBlank()) {
            log.warn("[Meta WhatsApp] Recipient phone or message body is empty.");
            return false;
        }

        String normalizedPhone = recipientPhone.replaceAll("[^0-9]", "");
        if (normalizedPhone.length() == 10) {
            normalizedPhone = "91" + normalizedPhone; // Default to India country code if 10 digits
        }

        String url = String.format("https://graph.facebook.com/%s/%s/messages", apiVersion, phoneNumberId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(accessToken);

        Map<String, Object> body = new HashMap<>();
        body.put("messaging_product", "whatsapp");
        body.put("to", normalizedPhone);
        body.put("type", "text");
        body.put("text", Map.of("body", text));

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            log.info("[Meta WhatsApp] Outbound message sent to {} (HTTP {}): {}", normalizedPhone, response.getStatusCode(), response.getBody());
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            log.error("[Meta WhatsApp] Failed to send message to {}: {}", normalizedPhone, e.getMessage());
            return false;
        }
    }
}
