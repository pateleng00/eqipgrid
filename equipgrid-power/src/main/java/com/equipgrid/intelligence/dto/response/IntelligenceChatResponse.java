package com.equipgrid.intelligence.dto.response;

import com.equipgrid.intelligence.dto.model.EquipmentCardDto;
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
public class IntelligenceChatResponse {
    private String reply;
    private String modelUsed; // e.g. "Gemini 1.5 Flash" or "EquipGrid Enterprise AI"
    private List<String> suggestedQuestions;
    private List<EquipmentCardDto> matchedEquipment;
    private String primaryActionUrl; // e.g. "/booking?equipmentId=1"
    private String primaryActionLabel; // e.g. "Book Now with Instant UPI"
    private Long timestamp;
}
