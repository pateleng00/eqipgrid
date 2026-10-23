package com.equipgrid.reporting.dto.response;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportingKpiSummaryResponse {
  private long machinesOnRentCount;
  private BigDecimal totalCollections;
  private long machinesInMaintenanceCount;
  private BigDecimal dealersRevenue;
  private long futureBookingsCount;
  private BigDecimal futureBookingsRevenue;
  private String dateRange;
  private Long stateId;
  private Long cityId;
  private Long hubId;
}
