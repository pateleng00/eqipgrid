package com.equipgrid.intelligence.dto.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IntelligenceChatMessage {
    private String role; // "user" or "model" or "assistant"
    private String content;
    private Long timestamp;
}
