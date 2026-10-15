package com.equipgrid.reporting.dto.response;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardSummaryResponse {
  private long totalAssets;
  private long availableAssets;
  private long activeRentals;
  private long pendingDispatch;
  private BigDecimal todayGrossRevenue;
  private BigDecimal totalRevenueCollected;
  private BigDecimal pendingSecurityDeposits;
  private double fleetUtilizationPercent;
  private double zeroCreditCompliancePercent;
}
