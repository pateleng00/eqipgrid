package com.equipgrid.whatsapp.controller;

import com.equipgrid.booking.entity.Booking;
import com.equipgrid.booking.repository.BookingQueryRepository;
import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.whatsapp.dto.request.WhatsAppInboundRequest;
import com.equipgrid.whatsapp.dto.request.WhatsAppNotificationRequest;
import com.equipgrid.whatsapp.dto.response.WhatsAppMessageResponse;
import com.equipgrid.whatsapp.service.IUpiQrGeneratorService;
import com.equipgrid.whatsapp.service.IWhatsAppBotService;
import com.equipgrid.whatsapp.service.IWhatsAppNotificationService;
import com.equipgrid.whatsapp.service.MetaWhatsAppClientService;
import com.equipgrid.whatsapp.service.WhatsAppNotificationServiceImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/whatsapp")
@RequiredArgsConstructor
@Tag(name = "WhatsApp Service", description = "WhatsApp bot, UPI QR code generation, and mobile-identified rental lifecycle")
public class WhatsAppWebhookController {

    private final IWhatsAppBotService whatsAppBotService;
    private final IWhatsAppNotificationService whatsAppNotificationService;
    private final IUpiQrGeneratorService upiQrGeneratorService;
    private final BookingQueryRepository bookingQueryRepository;

    private final MetaWhatsAppClientService metaWhatsAppClientService;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @Operation(summary = "Meta Webhook Verification Challenge", description = "Responds to Meta Cloud API webhook verification GET request")
    @GetMapping("/webhook")
    public ResponseEntity<String> verifyMetaWebhook(
            @RequestParam(value = "hub.mode", required = false) String mode,
            @RequestParam(value = "hub.verify_token", required = false) String token,
            @RequestParam(value = "hub.challenge", required = false) String challenge) {
        log.info("[Meta Webhook] Verification request: mode={}, token={}", mode, token);
        return ResponseEntity.ok(challenge != null ? challenge : "OK");
    }

    @Operation(summary = "WhatsApp Inbound Webhook (JSON)", description = "Receives incoming WhatsApp messages from Meta Cloud API or direct JSON")
    @PostMapping(value = "/webhook", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<WhatsAppMessageResponse>> handleIncomingJsonWebhook(@RequestBody com.fasterxml.jackson.databind.JsonNode payload) {
        WhatsAppInboundRequest request = parseInboundPayload(payload);
        if (request == null) {
            log.info("[WhatsApp Webhook] Received non-message event (e.g. delivery/status receipt), acknowledged with 200 OK");
            return ResponseEntity.ok(ApiResponse.<WhatsAppMessageResponse>buildSuccess("EVENT_ACK", "Event acknowledged", null));
        }
        log.info("Received WhatsApp webhook message from {}", request.getFrom());
        WhatsAppMessageResponse response = whatsAppBotService.processIncomingMessage(request);

        // Automatically dispatch bot response back to farmer via Meta Cloud API
        if (response != null && response.getMessage() != null && !response.getMessage().isBlank()) {
            metaWhatsAppClientService.sendTextMessage(request.getFrom(), response.getMessage());
        }

        return ResponseEntity.ok(ApiResponse.buildSuccess(response));
    }

    @Operation(summary = "WhatsApp Inbound Webhook (Twilio Form)", description = "Receives incoming WhatsApp messages from Twilio form-urlencoded webhooks")
    @PostMapping(value = "/webhook", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<WhatsAppMessageResponse>> handleIncomingTwilioWebhook(@RequestParam java.util.Map<String, String> formParams) {
        String from = formParams.getOrDefault("From", "").replace("whatsapp:", "").replace("+", "").trim();
        String body = formParams.getOrDefault("Body", "").trim();
        String profileName = formParams.getOrDefault("ProfileName", "Farmer");

        if (from.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.buildFail("INVALID_SENDER", "Missing From parameter", null));
        }

        WhatsAppInboundRequest request = WhatsAppInboundRequest.builder()
                .from(from)
                .message(body)
                .userName(profileName)
                .messageId(formParams.get("MessageSid"))
                .timestamp(System.currentTimeMillis() / 1000)
                .build();

        log.info("[Twilio Webhook] Received incoming message from {}, body: {}", from, body);
        WhatsAppMessageResponse response = whatsAppBotService.processIncomingMessage(request);
        return ResponseEntity.ok(ApiResponse.buildSuccess(response));
    }

    private WhatsAppInboundRequest parseInboundPayload(com.fasterxml.jackson.databind.JsonNode root) {
        if (root == null) return null;

        // 1. Check if direct WhatsAppInboundRequest format
        if (root.has("from") && !root.path("from").asText().isBlank()) {
            try {
                return objectMapper.treeToValue(root, WhatsAppInboundRequest.class);
            } catch (Exception e) {
                log.warn("Failed to deserialize direct WhatsAppInboundRequest: {}", e.getMessage());
            }
        }

        // 2. Check if Meta Cloud API nested structure
        if (root.has("entry")) {
            com.fasterxml.jackson.databind.JsonNode entry = root.path("entry");
            if (entry.isArray() && !entry.isEmpty()) {
                com.fasterxml.jackson.databind.JsonNode changes = entry.get(0).path("changes");
                if (changes.isArray() && !changes.isEmpty()) {
                    com.fasterxml.jackson.databind.JsonNode value = changes.get(0).path("value");

                    // Check for incoming customer messages
                    com.fasterxml.jackson.databind.JsonNode messages = value.path("messages");
                    if (messages.isArray() && !messages.isEmpty()) {
                        com.fasterxml.jackson.databind.JsonNode msg = messages.get(0);
                        String from = msg.path("from").asText();
                        String text = "";
                        if (msg.has("text")) {
                            text = msg.path("text").path("body").asText();
                        } else if (msg.has("button")) {
                            text = msg.path("button").path("text").asText();
                        } else if (msg.has("interactive")) {
                            com.fasterxml.jackson.databind.JsonNode interactive = msg.path("interactive");
                            if (interactive.has("button_reply")) {
                                text = interactive.path("button_reply").path("title").asText();
                            } else if (interactive.has("list_reply")) {
                                text = interactive.path("list_reply").path("title").asText();
                            }
                        }

                        String userName = "Farmer";
                        com.fasterxml.jackson.databind.JsonNode contacts = value.path("contacts");
                        if (contacts.isArray() && !contacts.isEmpty()) {
                            userName = contacts.get(0).path("profile").path("name").asText("Farmer");
                        }

                        WhatsAppInboundRequest.WhatsAppInboundRequestBuilder builder = WhatsAppInboundRequest.builder()
                                .from(from)
                                .message(text)
                                .userName(userName)
                                .messageId(msg.path("id").asText())
                                .timestamp(msg.path("timestamp").asLong(System.currentTimeMillis() / 1000));

                        // Handle location pin
                        if (msg.has("location")) {
                            com.fasterxml.jackson.databind.JsonNode loc = msg.path("location");
                            builder.latitude(loc.path("latitude").asDouble())
                                   .longitude(loc.path("longitude").asDouble())
                                   .locationName(loc.path("name").asText(null))
                                   .locationAddress(loc.path("address").asText(null));
                        }

                        return builder.build();
                    }

                    // Status receipt (delivered/read/failed)
                    com.fasterxml.jackson.databind.JsonNode statuses = value.path("statuses");
                    if (statuses.isArray() && !statuses.isEmpty()) {
                        com.fasterxml.jackson.databind.JsonNode st = statuses.get(0);
                        log.info("[Meta Status Webhook] Status: {}, recipient: {}, id: {}",
                                st.path("status").asText(), st.path("recipient_id").asText(), st.path("id").asText());
                        return null; // Acknowledged without triggering bot
                    }
                }
            }
        }

        return null;
    }

    @Operation(summary = "Simulate WhatsApp Conversation", description = "Interactive testing endpoint for rural mobile booking, UPI QR generation, and tracking")
    @PostMapping(value = "/simulate", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<WhatsAppMessageResponse>> simulateWhatsAppMessage(@Valid @RequestBody WhatsAppInboundRequest request) {
        log.info("Simulating WhatsApp conversation for phone: {}, message: {}", request.getFrom(), request.getMessage());
        WhatsAppMessageResponse response = whatsAppBotService.processIncomingMessage(request);
        return ResponseEntity.ok(ApiResponse.buildSuccess(response));
    }

    @Operation(summary = "Generate Dynamic UPI QR Code Image (PNG)", description = "Renders scannable UPI QR code PNG for a booking's advance & security deposit")
    @GetMapping(value = "/qr/{bookingNumber}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getUpiQrCodeImage(@PathVariable String bookingNumber) {
        Booking booking = bookingQueryRepository.fetchByBookingNumber(bookingNumber)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingNumber));

        String upiUri = upiQrGeneratorService.generateUpiPaymentUri(
                null,
                null,
                booking.getTotalAmount(),
                "Rent & Deposit for " + booking.getBookingNumber(),
                booking.getBookingNumber()
        );

        byte[] qrBytes = upiQrGeneratorService.generateQrCodeBytes(upiUri, 350, 350);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.IMAGE_PNG);
        headers.setCacheControl("no-cache, no-store, must-revalidate");

        return new ResponseEntity<>(qrBytes, headers, HttpStatus.OK);
    }

    @Operation(summary = "Send Outbound WhatsApp Notification", description = "Proactively triggers a custom WhatsApp alert")
    @PostMapping("/notify")
    public ResponseEntity<ApiResponse<WhatsAppMessageResponse>> sendNotification(@Valid @RequestBody WhatsAppNotificationRequest request) {
        WhatsAppMessageResponse response = whatsAppNotificationService.sendNotification(request);
        return ResponseEntity.ok(ApiResponse.buildSuccess(response));
    }

    @Operation(summary = "Notify Booking Created with UPI QR", description = "Sends booking confirmation and instant UPI QR Code")
    @PostMapping("/notify/booking/{bookingId}")
    public ResponseEntity<ApiResponse<WhatsAppMessageResponse>> notifyBookingCreated(@PathVariable Long bookingId) {
        WhatsAppMessageResponse response = whatsAppNotificationService.notifyBookingCreated(bookingId);
        return ResponseEntity.ok(ApiResponse.buildSuccess(response));
    }

    @Operation(summary = "Notify Equipment Dispatched", description = "Sends WhatsApp challan and driver dispatch alert to farmer")
    @PostMapping("/notify/dispatch/{bookingId}")
    public ResponseEntity<ApiResponse<WhatsAppMessageResponse>> notifyDispatchIssued(@PathVariable Long bookingId) {
        WhatsAppMessageResponse response = whatsAppNotificationService.notifyDispatchIssued(bookingId);
        return ResponseEntity.ok(ApiResponse.buildSuccess(response));
    }

    @Operation(summary = "Notify Return Inspection & UPI Refund", description = "Sends return deposit settlement and UPI refund confirmation")
    @PostMapping("/notify/settlement/{bookingId}")
    public ResponseEntity<ApiResponse<WhatsAppMessageResponse>> notifyReturnSettlement(@PathVariable Long bookingId) {
        WhatsAppMessageResponse response = whatsAppNotificationService.notifyReturnSettlement(bookingId);
        return ResponseEntity.ok(ApiResponse.buildSuccess(response));
    }

    @Operation(summary = "Notify Return Damage Checklist Ready",
            description = "Proactively notifies customer that their WhatsApp damage checklist is ready — sent when recovery vehicle is dispatched")
    @PostMapping("/notify/checklist/{bookingId}")
    public ResponseEntity<ApiResponse<WhatsAppMessageResponse>> notifyDamageChecklistReady(@PathVariable Long bookingId) {
        WhatsAppMessageResponse response = ((WhatsAppNotificationServiceImpl) whatsAppNotificationService)
                .notifyDamageChecklistReady(bookingId);
        return ResponseEntity.ok(ApiResponse.buildSuccess(response));
    }

    @Operation(summary = "Reset WhatsApp Session", description = "Resets conversation state back to MAIN_MENU for a given phone number")
    @PostMapping("/reset")
    public ResponseEntity<ApiResponse<Object>> resetConversation(@RequestParam String phone) {
        whatsAppBotService.resetConversation(phone);
        return ResponseEntity.ok(ApiResponse.buildSuccess("Conversation reset for " + phone));
    }

    @Operation(summary = "WhatsApp Machinery Catalog", description = "Returns machines formatted for WhatsApp preview with S3 photos, videos, and hub details")
    @GetMapping("/catalog")
    public ResponseEntity<ApiResponse<java.util.List<WhatsAppMessageResponse>>> getCatalog(
            @RequestParam(required = false) Long hubId) {
        return ResponseEntity.ok(ApiResponse.buildSuccess(whatsAppBotService.getCatalog(hubId)));
    }

    @Operation(summary = "List Active WhatsApp Conversations", description = "Lists all conversation states and phone numbers for station dashboard")
    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<java.util.List<com.equipgrid.whatsapp.entity.WhatsAppConversation>>> getConversations() {
        return ResponseEntity.ok(ApiResponse.buildSuccess(whatsAppBotService.getAllConversations()));
    }

    @Operation(summary = "Get WhatsApp Conversation by Phone", description = "Gets conversation context and history for a specific phone number")
    @GetMapping("/conversations/{phone}")
    public ResponseEntity<ApiResponse<com.equipgrid.whatsapp.entity.WhatsAppConversation>> getConversationByPhone(
            @PathVariable String phone) {
        return whatsAppBotService.getConversationByPhone(phone)
                .map(c -> ResponseEntity.ok(ApiResponse.buildSuccess(c)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.buildFail("SGO_404", "Conversation not found for phone: " + phone, null)));
    }
}
