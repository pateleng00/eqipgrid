package com.equipgrid.maintenance.dto;

import com.equipgrid.maintenance.enums.MaintenancePriority;
import com.equipgrid.maintenance.enums.MaintenanceStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMaintenanceProgressRequest {

  private MaintenanceStatus status;

  private MaintenancePriority priority;

  private String workScope;

  private BigDecimal estimatedCost;

  private LocalDate expectedCompletionDate;

  private String completionNotes;

  private String assignedTechnician;
}
