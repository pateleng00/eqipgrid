package com.equipgrid.maintenance.dto;

import com.equipgrid.maintenance.enums.MaintenanceLocationType;
import com.equipgrid.maintenance.enums.MaintenancePriority;
import com.equipgrid.maintenance.enums.MaintenanceServiceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class CreateMaintenanceRequest {

  @NotNull(message = "assetId is required")
  private Long assetId;

  @NotNull(message = "serviceType is required")
  private MaintenanceServiceType serviceType;

  @NotNull(message = "locationType is required")
  private MaintenanceLocationType locationType;

  private String serviceCenterName;

  private String serviceCenterContact;

  private String serviceCenterAddress;

  @Builder.Default private MaintenancePriority priority = MaintenancePriority.NORMAL;

  @NotBlank(message = "issueDescription is required")
  private String issueDescription;

  private String workScope;

  private BigDecimal estimatedCost;

  private LocalDate expectedCompletionDate;

  private Integer meterHoursAtService;

  private String assignedTechnician;
}
