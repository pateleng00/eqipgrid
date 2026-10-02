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
public class WhatsAppNotificationRequest {

    @NotBlank(message = "Phone number is required")
    private String phoneNumber;

    private String bookingNumber;

    @NotBlank(message = "Notification type is required")
    private String notificationType;

    private String customMessage;
}
