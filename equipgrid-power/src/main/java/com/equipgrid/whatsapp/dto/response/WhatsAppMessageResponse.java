package com.equipgrid.whatsapp.dto.response;

import com.equipgrid.whatsapp.dto.model.UpiPaymentDetails;
import com.equipgrid.whatsapp.enums.WhatsAppState;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class WhatsAppMessageResponse {
    private String to;
    private String message;
    private WhatsAppState state;
    private String bookingNumber;
    private UpiPaymentDetails upiPayment;
    private List<String> suggestedOptions;
    private boolean sessionReset;
    private String previewImageUrl;
    private String demoVideoUrl;
    private List<String> mediaUrls;
    private String hubName;
    private String cityName;
}
