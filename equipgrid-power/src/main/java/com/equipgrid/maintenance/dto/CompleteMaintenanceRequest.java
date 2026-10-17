package com.equipgrid.maintenance.dto;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompleteMaintenanceRequest {

  private BigDecimal actualPartsCost;

  private BigDecimal actualLaborCost;

  private BigDecimal totalCost;

  private String invoiceNumber;

  private String invoiceDocumentUrl;

  private String invoiceFileName;

  private String invoiceFileType;

  private String completionNotes;

  private Integer meterHoursAfterService;

  private Integer nextServiceDueHours;
}
