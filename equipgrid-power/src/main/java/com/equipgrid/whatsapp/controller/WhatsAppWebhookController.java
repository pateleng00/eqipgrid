package com.equipgrid.whatsapp.controller;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.core.ratelimiter.RateLimited;
import com.equipgrid.whatsapp.dto.model.UpiPaymentDetails;
import com.equipgrid.whatsapp.dto.request.WhatsAppInboundRequest;
import com.equipgrid.whatsapp.dto.request.WhatsAppNotificationRequest;
import com.equipgrid.whatsapp.dto.response.WhatsAppMessageResponse;
import com.equipgrid.whatsapp.entity.WhatsAppConversation;
import com.equipgrid.whatsapp.service.IUpiQrGeneratorService;
import com.equipgrid.whatsapp.service.IWhatsAppBotService;
import com.equipgrid.whatsapp.service.IWhatsAppNotificationService;
import com.equipgrid.whatsapp.service.IWhatsAppWebhookService;
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

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/whatsapp")
@RequiredArgsConstructor
@Tag(name = "WhatsApp Service", description = "WhatsApp bot, UPI QR code generation, and mobile-identified rental lifecycle")
public class WhatsAppWebhookController {

    private final IWhatsAppWebhookService whatsAppWebhookService;
    private final IWhatsAppBotService whatsAppBotService;
    private final IWhatsAppNotificationService whatsAppNotificationService;
    private final IUpiQrGeneratorService upiQrGeneratorService;

    @Operation(summary = "Meta Webhook Verification Challenge", description = "Responds to Meta Cloud API webhook verification GET request")
    @GetMapping("/webhook")
    public ResponseEntity<String> verifyMetaWebhook(@RequestParam(value = "hub.mode", required = false) String mode, @RequestParam(value = "hub.verify_token", required = false) String token, @RequestParam(value = "hub.challenge", required = false) String challenge) {
        log.info("[Meta Webhook] Verification request: mode={}, token={}", mode, token);

        if (whatsAppWebhookService.verifyWebhookChallenge(mode, token)) {
            log.info("[Meta Webhook] Verify token challenge accepted. Mode={}, token={}", mode, token);
            return ResponseEntity.ok(challenge != null ? challenge : "OK");
        }

        log.warn("[Meta Webhook] Challenge verification failed! Received mode={}, token={}", mode, token);
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Verification challenge failed: invalid token");
    }

    @Operation(summary = "WhatsApp Inbound Webhook (JSON)", description = "Receives incoming WhatsApp messages from Meta Cloud API or direct JSON")
    @PostMapping(value = "/webhook", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<WhatsAppMessageResponse>> handleIncomingJsonWebhook(@RequestHeader(value = "X-Hub-Signature-256", required = false) String signatureHeader, @RequestBody String rawPayload) {

        WhatsAppMessageResponse response = whatsAppWebhookService.processJsonWebhook(signatureHeader, rawPayload);
        if (response == null) {
            log.info("[WhatsApp Webhook] Received non-message event (e.g. delivery/status receipt), acknowledged with 200 OK");
            return ResponseEntity.ok(ApiResponse.buildSuccess("EVENT_ACK", "Event acknowledged", null));
        }

        return ResponseEntity.ok(ApiResponse.buildSuccess(response));
    }

    @Operation(summary = "WhatsApp Inbound Webhook (Twilio Form)", description = "Receives incoming WhatsApp messages from Twilio form-urlencoded webhooks")
    @PostMapping(value = "/webhook", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<WhatsAppMessageResponse>> handleIncomingTwilioWebhook(@RequestParam Map<String, String> formParams) {
        WhatsAppMessageResponse response = whatsAppWebhookService.processTwilioWebhook(formParams);
        return ResponseEntity.ok(ApiResponse.buildSuccess(response));
    }

    @Operation(summary = "Simulate WhatsApp Conversation", description = "Interactive testing endpoint for rural mobile booking, UPI QR generation, and tracking")
    @PostMapping(value = "/simulate", produces = MediaType.APPLICATION_JSON_VALUE)
    @RateLimited(limit = 10, name = "whatsapp_simulate")
    public ResponseEntity<ApiResponse<WhatsAppMessageResponse>> simulateWhatsAppMessage(@Valid @RequestBody WhatsAppInboundRequest request) {
        log.info("Simulating WhatsApp conversation for phone: {}, message: {}", request.getFrom(), request.getMessage());
        WhatsAppMessageResponse response = whatsAppBotService.processIncomingMessage(request);
        return ResponseEntity.ok(ApiResponse.buildSuccess(response));
    }

    @Operation(summary = "Generate Dynamic UPI QR Code Image (PNG)", description = "Renders scannable UPI QR code PNG for a booking's advance & security deposit")
    @GetMapping(value = "/qr/{bookingNumber}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getUpiQrCodeImage(@PathVariable String bookingNumber) {
        byte[] qrBytes = whatsAppWebhookService.generateBookingQrCodeImage(bookingNumber);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.IMAGE_PNG);
        headers.setCacheControl("no-cache, no-store, must-revalidate");

        return new ResponseEntity<>(qrBytes, headers, HttpStatus.OK);
    }

    @Operation(summary = "Generate Merchant Desk UPI QR Code Image (PNG)", description = "Renders scannable merchant UPI QR code PNG for the rental yard desk")
    @GetMapping(value = {"/qr/merchant", "/qr/desk"}, produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getMerchantUpiQrCodeImage(@RequestParam(required = false) BigDecimal amount, @RequestParam(required = false) String note) {
        byte[] qrBytes = whatsAppWebhookService.generateMerchantQrCodeImage(amount, note);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.IMAGE_PNG);
        headers.setCacheControl("no-cache, no-store, must-revalidate");

        return new ResponseEntity<>(qrBytes, headers, HttpStatus.OK);
    }

    @Operation(summary = "Get Merchant Desk UPI Payment Details", description = "Returns active VPA, payee name, and generated QR code base64/URL")
    @GetMapping("/qr/merchant/details")
    public ResponseEntity<ApiResponse<UpiPaymentDetails>> getMerchantUpiDetails(@RequestParam(required = false) BigDecimal amount, @RequestParam(required = false) String note) {
        UpiPaymentDetails details = upiQrGeneratorService.getMerchantUpiDetails(amount, note);
        return ResponseEntity.ok(ApiResponse.buildSuccess(details));
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
        WhatsAppMessageResponse response = whatsAppNotificationService.notifyDamageChecklistReady(bookingId);
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
    public ResponseEntity<ApiResponse<List<WhatsAppMessageResponse>>> getCatalog(
            @RequestParam(required = false) Long hubId) {
        return ResponseEntity.ok(ApiResponse.buildSuccess(whatsAppBotService.getCatalog(hubId)));
    }

    @Operation(summary = "List Active WhatsApp Conversations", description = "Lists all conversation states and phone numbers for station dashboard")
    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<List<WhatsAppConversation>>> getConversations() {
        return ResponseEntity.ok(ApiResponse.buildSuccess(whatsAppBotService.getAllConversations()));
    }

    @Operation(summary = "Get WhatsApp Conversation by Phone", description = "Gets conversation context and history for a specific phone number")
    @GetMapping("/conversations/{phone}")
    public ResponseEntity<ApiResponse<WhatsAppConversation>> getConversationByPhone(@PathVariable String phone) {
        return whatsAppBotService.getConversationByPhone(phone)
                .map(c -> ResponseEntity.ok(ApiResponse.buildSuccess(c)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.buildFail("SGO_404", "Conversation not found for phone: " + phone, null)));
    }
}
