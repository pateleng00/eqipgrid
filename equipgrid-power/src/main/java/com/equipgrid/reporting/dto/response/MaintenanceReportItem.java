package com.equipgrid.reporting.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaintenanceReportItem {
  private Long assetId;
  private String assetTag;
  private String machineName;
  private String modelName;
  private String category;
  private Long hubId;
  private String hubName;
  private String cityName;
  private String stateName;
  private String ticketNumber;
  private String issueDescription;
  private String maintenanceType;
  private String technicianName;
  private LocalDateTime enteredMaintenanceAt;
  private LocalDate estimatedCompletionDate;
  private BigDecimal estimatedCost;
  private String priority;
  private String status;
}
