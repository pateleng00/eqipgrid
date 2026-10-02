package com.equipgrid.returninspection.dto.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

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
