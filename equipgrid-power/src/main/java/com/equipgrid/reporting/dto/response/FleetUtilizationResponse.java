package com.equipgrid.reporting.dto.response;

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
