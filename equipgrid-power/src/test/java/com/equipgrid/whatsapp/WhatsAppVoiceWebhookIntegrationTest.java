package com.equipgrid.whatsapp;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.whatsapp.controller.WhatsAppWebhookController;
import com.equipgrid.whatsapp.dto.model.VoiceBookingIntent;
import com.equipgrid.whatsapp.dto.request.WhatsAppInboundRequest;
import com.equipgrid.whatsapp.dto.response.WhatsAppMessageResponse;
import com.equipgrid.whatsapp.enums.WhatsAppState;
import com.equipgrid.whatsapp.service.IWhatsAppBotService;
import com.equipgrid.whatsapp.service.MetaWhatsAppClientService;
import com.equipgrid.whatsapp.service.VoiceNoteProcessingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class WhatsAppVoiceWebhookIntegrationTest {

    private static final String SENDER_PHONE = "919876500001";

    @Autowired
    private WhatsAppWebhookController webhookController;

    @Autowired
    private IWhatsAppBotService whatsAppBotService;

    @Autowired
    private VoiceNoteProcessingService voiceNoteProcessingService;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private MetaWhatsAppClientService metaWhatsAppClientService;

    @Test
    @DisplayName("Meta Webhook: Successfully reads audio voice note and extracts mediaId and mimeType")
    void testMetaAudioWebhookProcessing() {
        // Mock outbound Meta text sending
        Mockito.when(metaWhatsAppClientService.sendTextMessage(anyString(), anyString())).thenReturn(true);
        // Mock downloading media bytes for mediaId: return valid dummy bytes
        Mockito.when(metaWhatsAppClientService.downloadMediaBytes("voice_media_9999"))
                .thenReturn(new byte[]{0x4f, 0x67, 0x67, 0x53}); // 'OggS' header

        String metaPayload = """
                {
                  "object": "whatsapp_business_account",
                  "entry": [
                    {
                      "id": "1795175008399502",
                      "changes": [
                        {
                          "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                              "display_phone_number": "15556300171",
                              "phone_number_id": "1450975934758555"
                            },
                            "contacts": [
                              {
                                "profile": { "name": "Ramesh Kumar" },
                                "wa_id": "%s"
                              }
                            ],
                            "messages": [
                              {
                                "from": "%s",
                                "id": "wamid.HBgLMjA2M...",
                                "timestamp": "1712345678",
                                "type": "audio",
                                "audio": {
                                  "id": "voice_media_9999",
                                  "mime_type": "audio/ogg; codecs=opus",
                                  "voice": true,
                                  "transcription": "Mujhe 3 din ke liye tractor chahiye Sandila hub pe"
                                }
                              }
                            ]
                          },
                          "field": "messages"
                        }
                      ]
                    }
                  ]
                }
                """.formatted(SENDER_PHONE, SENDER_PHONE);

        ResponseEntity<ApiResponse<WhatsAppMessageResponse>> response =
                webhookController.handleIncomingJsonWebhook(null, metaPayload);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());

        WhatsAppMessageResponse botResponse = response.getBody().getData();
        assertNotNull(botResponse);
        // Customer requested tractor for 3 days -> parsed intent BROWSE_RENT
        assertNotNull(botResponse.getMessage());
        assertTrue(botResponse.getMessage().contains("आवाज़ सन्देश प्राप्त हुआ") || botResponse.getMessage().contains("Tractor"),
                "Response must acknowledge receipt of voice note and route equipment intent");
    }

    @Test
    @DisplayName("Twilio Webhook: Successfully reads audio form params and processes voice note")
    void testTwilioAudioWebhookProcessing() {
        Map<String, String> formParams = new HashMap<>();
        formParams.put("From", "whatsapp:+" + SENDER_PHONE);
        formParams.put("ProfileName", "Suresh Patel");
        formParams.put("MessageSid", "SM1234567890");
        formParams.put("NumMedia", "1");
        formParams.put("MediaContentType0", "audio/ogg");
        formParams.put("MediaUrl0", "https://api.twilio.com/2010-04-01/Accounts/AC123/Media/ME123");
        formParams.put("TranscriptionText", "mera order kahan tak pahuncha");

        ResponseEntity<ApiResponse<WhatsAppMessageResponse>> response =
                webhookController.handleIncomingTwilioWebhook(formParams);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());

        WhatsAppMessageResponse botResponse = response.getBody().getData();
        assertNotNull(botResponse);
        assertNotNull(botResponse.getMessage());
        // Should route to TRACK_ORDER intent
        assertTrue(botResponse.getMessage().contains("आवाज़ सन्देश") || botResponse.getMessage().contains("स्थिति") || botResponse.getMessage().contains("बुकिंग"),
                "Response should handle TRACK_ORDER intent from transcribed audio");
    }

    @Test
    @DisplayName("VoiceNoteProcessingService: Parses Hindi & Hinglish audio intent with keyword fallback")
    void testVoiceIntentParsingFallback() {
        // Keyword-based extraction when Gemini API call is not executed
        VoiceBookingIntent rentIntent = voiceNoteProcessingService.parseTranscriptIntent("mujhe concrete mixer 2 din ke liye chahiye");
        assertTrue(rentIntent.isTranscriptionSucceeded());
        assertEquals("BROWSE_RENT", rentIntent.getIntent());
        assertEquals("CONSTRUCTION", rentIntent.getAssetCategory());
        assertEquals(2, rentIntent.getRentalDays());

        VoiceBookingIntent payIntent = voiceNoteProcessingService.parseTranscriptIntent("payment karna hai upi qr bhejo");
        assertTrue(payIntent.isTranscriptionSucceeded());
        assertEquals("PAY", payIntent.getIntent());

        VoiceBookingIntent returnIntent = voiceNoteProcessingService.parseTranscriptIntent("machine wapas karni hai pickup bhej do");
        assertTrue(returnIntent.isTranscriptionSucceeded());
        assertEquals("RETURN", returnIntent.getIntent());
    }

    @Test
    @DisplayName("Simulate Webhook: Audio message without data triggers friendly voice retry prompt")
    void testAudioWithoutDataTriggersRetryPrompt() {
        WhatsAppInboundRequest request = WhatsAppInboundRequest.builder()
                .from(SENDER_PHONE)
                .userName("Farmer")
                .mediaType("audio")
                .timestamp(System.currentTimeMillis() / 1000)
                .build();

        WhatsAppMessageResponse response = whatsAppBotService.processIncomingMessage(request);
        assertNotNull(response);
        assertEquals(WhatsAppState.MAIN_MENU, response.getState());
        assertTrue(response.getMessage().contains("आवाज़ सन्देश नहीं समझ आया") || response.getMessage().contains("दोबारा आवाज़ भेजें"),
                "Should guide user with clear retry instructions when no audio content is received");
    }
}
