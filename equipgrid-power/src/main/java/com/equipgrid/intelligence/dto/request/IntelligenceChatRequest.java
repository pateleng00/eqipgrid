package com.equipgrid.intelligence.dto.request;

import com.equipgrid.intelligence.dto.model.IntelligenceChatMessage;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IntelligenceChatRequest {

    @NotBlank(message = "User message cannot be empty")
    private String message;

    private List<IntelligenceChatMessage> conversationHistory;
    private String userPhone;
    private String userName;
    private String preferredLanguage;
    private String location;
}
