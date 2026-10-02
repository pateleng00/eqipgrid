package com.equipgrid.reporting.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FleetUtilizationResponse {
    private long totalAssets;
    private long availableAssets;
    private long onRentAssets;
    private long maintenanceAssets;
    private double utilizationPercentage;
    private Map<String, Long> assetsByCategory;
    private Map<String, Long> assetsByStatus;
}
