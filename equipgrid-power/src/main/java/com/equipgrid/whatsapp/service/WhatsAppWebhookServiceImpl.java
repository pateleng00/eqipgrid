package com.equipgrid.whatsapp.service;

import com.equipgrid.booking.entity.Booking;
import com.equipgrid.booking.service.IBookingService;
import com.equipgrid.whatsapp.dto.request.WhatsAppInboundRequest;
import com.equipgrid.whatsapp.dto.response.WhatsAppMessageResponse;
import com.equipgrid.whatsapp.security.MetaSignatureValidator;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class WhatsAppWebhookServiceImpl implements IWhatsAppWebhookService {

  private final IWhatsAppBotService whatsAppBotService;
  private final MetaWhatsAppClientService metaWhatsAppClientService;
  private final IUpiQrGeneratorService upiQrGeneratorService;
  private final IBookingService bookingService;
  private final MetaSignatureValidator metaSignatureValidator;
  private final ObjectMapper objectMapper;

  @Value("${equipgrid.whatsapp.meta.verify-token:eq_whk_default_token}")
  private String metaVerifyToken;

  @Override
  public boolean verifyWebhookChallenge(String mode, String token) {
    log.info("[Meta Webhook] Verification challenge request: mode={}, token={}", mode, token);
    return "subscribe".equals(mode) && metaVerifyToken.equals(token);
  }

  @Override
  public WhatsAppMessageResponse processJsonWebhook(String signatureHeader, String rawPayload) {
    if (!metaSignatureValidator.isValidSignature(rawPayload, signatureHeader)) {
      log.warn("[WhatsApp Webhook] Signature verification failed! signature={}", signatureHeader);
      throw new SecurityException("Invalid or missing X-Hub-Signature-256 header");
    }

    JsonNode payload;
    try {
      payload = objectMapper.readTree(rawPayload);
    } catch (Exception e) {
      log.error("[WhatsApp Webhook] Failed to parse JSON body: {}", e.getMessage());
      throw new IllegalArgumentException("Malformed JSON body");
    }

    WhatsAppInboundRequest request = parseInboundPayload(payload);
    if (request == null) {
      log.info("[WhatsApp Webhook] Received non-message event (e.g. status/delivery receipt)");
      return null;
    }

    log.info(
        "Processing WhatsApp message from {} | mediaType: {} | mediaId: {}",
        request.getFrom(),
        request.getMediaType(),
        request.getMediaId());
    WhatsAppMessageResponse response = whatsAppBotService.processIncomingMessage(request);

    if (response != null && response.getMessage() != null && !response.getMessage().isBlank()) {
      metaWhatsAppClientService.sendTextMessage(request.getFrom(), response.getMessage());
    }

    return response;
  }

  @Override
  public WhatsAppMessageResponse processTwilioWebhook(Map<String, String> formParams) {
    String from =
        formParams.getOrDefault("From", "").replace("whatsapp:", "").replace("+", "").trim();
    String body = formParams.getOrDefault("Body", "").trim();
    String profileName = formParams.getOrDefault("ProfileName", "");

    if (from.isBlank()) {
      throw new IllegalArgumentException("Missing 'From' parameter in Twilio webhook");
    }

    WhatsAppInboundRequest.WhatsAppInboundRequestBuilder builder =
        WhatsAppInboundRequest.builder()
            .from(from)
            .message(body)
            .userName(profileName)
            .messageId(formParams.get("MessageSid"))
            .timestamp(System.currentTimeMillis() / 1000);

    String mediaContentType = formParams.get("MediaContentType0");
    String mediaUrl = formParams.get("MediaUrl0");
    String transcriptionText = formParams.get("TranscriptionText");

    if (mediaContentType != null
        && (mediaContentType.startsWith("audio/")
            || mediaContentType.contains("audio")
            || mediaContentType.contains("ogg"))) {
      builder.mediaType("audio").mediaUrl(mediaUrl).mimeType(mediaContentType);
      if (transcriptionText != null && !transcriptionText.isBlank()) {
        builder.transcribedText(transcriptionText);
      }
    } else if (mediaContentType != null && mediaContentType.startsWith("image/")) {
      builder.mediaType("image").mediaUrl(mediaUrl).mimeType(mediaContentType);
    }

    WhatsAppInboundRequest request = builder.build();
    log.info(
        "[Twilio Webhook] Received incoming message from {}, body: {}, mediaType: {}",
        from,
        body,
        request.getMediaType());
    return whatsAppBotService.processIncomingMessage(request);
  }

  @Override
  public byte[] generateBookingQrCodeImage(String bookingNumber) {
    if ("merchant".equalsIgnoreCase(bookingNumber)
        || "desk".equalsIgnoreCase(bookingNumber)
        || "quick".equalsIgnoreCase(bookingNumber)) {
      return generateMerchantQrCodeImage(null, null);
    }

    Booking booking = bookingService.getBookingByNumber(bookingNumber);
    if (booking == null) {
      throw new IllegalArgumentException("Booking not found: " + bookingNumber);
    }

    String upiUri =
        upiQrGeneratorService.generateUpiPaymentUri(
            null,
            null,
            booking.getTotalAmount(),
            "Rent & Deposit for " + booking.getBookingNumber(),
            booking.getBookingNumber());

    return upiQrGeneratorService.generateQrCodeBytes(upiUri, 350, 350);
  }

  @Override
  public byte[] generateMerchantQrCodeImage(BigDecimal amount, String note) {
    String upiUri =
        upiQrGeneratorService.generateUpiPaymentUri(
            null,
            null,
            amount != null ? amount : BigDecimal.ZERO,
            note != null && !note.isBlank() ? note : "EquipGrid Rental Desk Payment",
            "EQ-DESK-" + System.currentTimeMillis());

    return upiQrGeneratorService.generateQrCodeBytes(upiUri, 350, 350);
  }

  private WhatsAppInboundRequest parseInboundPayload(JsonNode root) {
    if (root == null) return null;

    // 1. Direct WhatsAppInboundRequest JSON
    if (root.has("from") && !root.path("from").asText().isBlank()) {
      try {
        WhatsAppInboundRequest direct =
            objectMapper.treeToValue(root, WhatsAppInboundRequest.class);
        if (root.has("audio")
            && (direct.getMediaType() == null || direct.getMediaType().isBlank())) {
          JsonNode audioNode = root.path("audio");
          direct.setMediaType("audio");
          if (audioNode.has("id")
              && (direct.getMediaId() == null || direct.getMediaId().isBlank())) {
            direct.setMediaId(audioNode.path("id").asText());
          }
          if (audioNode.has("mime_type")
              && (direct.getMimeType() == null || direct.getMimeType().isBlank())) {
            direct.setMimeType(audioNode.path("mime_type").asText());
          }
          if (audioNode.has("url")
              && (direct.getMediaUrl() == null || direct.getMediaUrl().isBlank())) {
            direct.setMediaUrl(audioNode.path("url").asText());
          } else if (audioNode.has("link")
              && (direct.getMediaUrl() == null || direct.getMediaUrl().isBlank())) {
            direct.setMediaUrl(audioNode.path("link").asText());
          }
          if (audioNode.has("transcription")
              && (direct.getTranscribedText() == null || direct.getTranscribedText().isBlank())) {
            direct.setTranscribedText(audioNode.path("transcription").asText());
          }
        }
        return direct;
      } catch (Exception e) {
        log.warn("Failed to deserialize direct WhatsAppInboundRequest: {}", e.getMessage());
      }
    }

    // 2. Meta Cloud API Webhook structure
    if (root.has("entry")) {
      JsonNode entry = root.path("entry");
      if (entry.isArray() && !entry.isEmpty()) {
        JsonNode changes = entry.get(0).path("changes");
        if (changes.isArray() && !changes.isEmpty()) {
          JsonNode value = changes.get(0).path("value");

          JsonNode messages = value.path("messages");
          if (messages.isArray() && !messages.isEmpty()) {
            JsonNode msg = messages.get(0);
            String from = msg.path("from").asText();
            String text = "";
            if (msg.has("text")) {
              text = msg.path("text").path("body").asText();
            } else if (msg.has("button")) {
              text = msg.path("button").path("text").asText();
            } else if (msg.has("interactive")) {
              JsonNode interactive = msg.path("interactive");
              if (interactive.has("button_reply")) {
                text = interactive.path("button_reply").path("title").asText();
              } else if (interactive.has("list_reply")) {
                text = interactive.path("list_reply").path("title").asText();
              }
            }

            String userName = "Farmer";
            JsonNode contacts = value.path("contacts");
            if (contacts.isArray() && !contacts.isEmpty()) {
              userName = contacts.get(0).path("profile").path("name").asText("Farmer");
            }

            WhatsAppInboundRequest.WhatsAppInboundRequestBuilder builder =
                WhatsAppInboundRequest.builder()
                    .from(from)
                    .message(text)
                    .userName(userName)
                    .messageId(msg.path("id").asText())
                    .timestamp(msg.path("timestamp").asLong(System.currentTimeMillis() / 1000));

            String type = msg.path("type").asText("");
            if ("audio".equalsIgnoreCase(type)
                || "voice".equalsIgnoreCase(type)
                || msg.has("audio")
                || msg.has("voice")) {
              JsonNode audioNode = msg.has("audio") ? msg.path("audio") : msg.path("voice");
              builder.mediaType("audio");
              if (audioNode.has("id")) {
                builder.mediaId(audioNode.path("id").asText());
              }
              if (audioNode.has("mime_type")) {
                builder.mimeType(audioNode.path("mime_type").asText());
              }
              if (audioNode.has("link")) {
                builder.mediaUrl(audioNode.path("link").asText());
              } else if (audioNode.has("url")) {
                builder.mediaUrl(audioNode.path("url").asText());
              }
              if (audioNode.has("transcription")) {
                builder.transcribedText(audioNode.path("transcription").asText());
              } else if (audioNode.has("text")) {
                builder.transcribedText(audioNode.path("text").asText());
              }
            } else if ("image".equalsIgnoreCase(type) || msg.has("image")) {
              JsonNode imgNode = msg.path("image");
              builder.mediaType("image");
              if (imgNode.has("id")) {
                builder.mediaId(imgNode.path("id").asText());
              }
              if (imgNode.has("mime_type")) {
                builder.mimeType(imgNode.path("mime_type").asText());
              }
              if (imgNode.has("link")) {
                builder.mediaUrl(imgNode.path("link").asText());
              } else if (imgNode.has("url")) {
                builder.mediaUrl(imgNode.path("url").asText());
              }
              if (imgNode.has("caption") && text.isBlank()) {
                text = imgNode.path("caption").asText();
                builder.message(text);
              }
            }

            if (msg.has("location")) {
              JsonNode loc = msg.path("location");
              builder
                  .latitude(loc.path("latitude").asDouble())
                  .longitude(loc.path("longitude").asDouble())
                  .locationName(loc.path("name").asText(null))
                  .locationAddress(loc.path("address").asText(null));
            }

            return builder.build();
          }

          JsonNode statuses = value.path("statuses");
          if (statuses.isArray() && !statuses.isEmpty()) {
            JsonNode st = statuses.get(0);
            log.info(
                "[Meta Status Webhook] Status: {}, recipient: {}, id: {}",
                st.path("status").asText(),
                st.path("recipient_id").asText(),
                st.path("id").asText());
            return null;
          }
        }
      }
    }

    return null;
  }
}
