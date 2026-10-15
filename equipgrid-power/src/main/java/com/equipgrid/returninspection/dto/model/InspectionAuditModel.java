package com.equipgrid.returninspection.dto.model;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InspectionAuditModel {
  private Long inspectionId;
  private Long bookingId;
  private BigDecimal totalDeductions;
  private boolean flaggedForMajorRepair;
  private String reviewerSignOff;
}
