package com.equipgrid.whatsapp.service;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
public class MetaWhatsAppClientService {

  private final RestTemplate restTemplate = new RestTemplate();

  @Value("${equipgrid.whatsapp.meta.phone-number-id:}")
  private String phoneNumberId;

  @Value("${equipgrid.whatsapp.meta.access-token:}")
  private String accessToken;

  @Value("${equipgrid.whatsapp.meta.api-version:v21.0}")
  private String apiVersion;

  /** Dispatches a free-form text message via Meta WhatsApp Cloud API. */
  public boolean sendTextMessage(String recipientPhone, String text) {
    if (accessToken == null
        || accessToken.isBlank()
        || phoneNumberId == null
        || phoneNumberId.isBlank()) {
      log.warn(
          "[Meta WhatsApp] Credentials not configured. Skipping message to: {}", recipientPhone);
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

    String url =
        String.format("https://graph.facebook.com/%s/%s/messages", apiVersion, phoneNumberId);

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
      log.info(
          "[Meta WhatsApp] Outbound message sent to {} (HTTP {}): {}",
          normalizedPhone,
          response.getStatusCode(),
          response.getBody());
      return response.getStatusCode().is2xxSuccessful();
    } catch (Exception e) {
      log.error(
          "[Meta WhatsApp] Failed to send message to {}: {}", normalizedPhone, e.getMessage());
      return false;
    }
  }

  /** Retrieves media URL metadata from Meta Graph API for a given media ID. */
  public String getMediaUrl(String mediaId) {
    if (accessToken == null || accessToken.isBlank() || mediaId == null || mediaId.isBlank()) {
      log.warn("[Meta WhatsApp] Cannot fetch media URL: credentials or mediaId missing.");
      return null;
    }
    String url = String.format("https://graph.facebook.com/%s/%s", apiVersion, mediaId);
    HttpHeaders headers = new HttpHeaders();
    headers.setBearerAuth(accessToken);
    HttpEntity<Void> entity = new HttpEntity<>(headers);

    try {
      ResponseEntity<JsonNode> response =
          restTemplate.exchange(url, HttpMethod.GET, entity, JsonNode.class);
      if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
        String downloadUrl = response.getBody().path("url").asText(null);
        log.info(
            "[Meta WhatsApp] Retrieved media download URL for mediaId {}: {}",
            mediaId,
            downloadUrl);
        return downloadUrl;
      }
    } catch (Exception e) {
      log.error(
          "[Meta WhatsApp] Failed to fetch media URL for mediaId={}: {}", mediaId, e.getMessage());
    }
    return null;
  }

  /** Downloads raw media bytes from Meta Cloud API given a media ID. */
  public byte[] downloadMediaBytes(String mediaId) {
    String mediaUrl = getMediaUrl(mediaId);
    if (mediaUrl == null || mediaUrl.isBlank()) {
      log.warn("[Meta WhatsApp] Could not resolve download URL for mediaId: {}", mediaId);
      return null;
    }
    return downloadMediaBytesFromUrl(mediaUrl);
  }

  /** Downloads media bytes from Meta media download URL using Bearer authentication. */
  public byte[] downloadMediaBytesFromUrl(String mediaUrl) {
    if (accessToken == null || accessToken.isBlank() || mediaUrl == null || mediaUrl.isBlank()) {
      log.warn("[Meta WhatsApp] Cannot download media: access token or mediaUrl missing.");
      return null;
    }
    HttpHeaders headers = new HttpHeaders();
    headers.setBearerAuth(accessToken);
    headers.set("User-Agent", "EquipGrid-WhatsApp-Service/1.0");
    HttpEntity<Void> entity = new HttpEntity<>(headers);

    try {
      ResponseEntity<byte[]> response =
          restTemplate.exchange(mediaUrl, HttpMethod.GET, entity, byte[].class);
      if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
        log.info(
            "[Meta WhatsApp] Successfully downloaded {} bytes from Meta media URL",
            response.getBody().length);
        return response.getBody();
      }
    } catch (Exception e) {
      log.error("[Meta WhatsApp] Failed to download media from URL: {}", e.getMessage());
    }
    return null;
  }
}
