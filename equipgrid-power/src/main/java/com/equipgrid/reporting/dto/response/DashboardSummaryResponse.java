package com.equipgrid.reporting.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

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
