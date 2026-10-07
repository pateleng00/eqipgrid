package com.equipgrid.whatsapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WhatsAppInboundRequest {

    @NotBlank(message = "Sender phone number is required")
    private String from;

    private String message;

    private String userName;
    private String messageId;
    private Long timestamp;

    // Direct WhatsApp Geo-Location / Pin payload support
    private Double latitude;
    private Double longitude;
    private String locationName;
    private String locationAddress;

    // ─── Voice Note / Audio Message support ─────────────────────────────────
    // mediaType: "audio", "image", "video", "document", "text" (null = text)
    private String mediaType;
    // Publicly accessible media URL (from Meta Cloud API media download endpoint)
    private String mediaUrl;
    // WhatsApp media ID (used to fetch media URL from Meta Graph API if needed)
    private String mediaId;
    // MIME type of the media (e.g. "audio/ogg; codecs=opus", "audio/mpeg")
    private String mimeType;
    // Pre-transcribed text if upstream BSP already ran STT (e.g. Gupshup transcription)
    private String transcribedText;
}
