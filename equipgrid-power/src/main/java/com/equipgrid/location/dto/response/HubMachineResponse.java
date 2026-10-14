package com.equipgrid.location.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HubMachineResponse {
    private Long assetId;
    private String assetTag;
    private String name;
    private String modelName;
    private String category;
    private String categoryDescription;
    private BigDecimal dailyRate;
    private BigDecimal depositAmount;
    private String status;
    private String imageUrl;
    private String conditionNotes;
}
