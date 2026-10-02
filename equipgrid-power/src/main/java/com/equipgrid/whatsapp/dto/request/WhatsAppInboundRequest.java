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
}
