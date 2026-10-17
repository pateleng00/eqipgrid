package com.equipgrid.maintenance.dto;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.maintenance.entity.MaintenanceRecord;
import com.equipgrid.maintenance.enums.MaintenanceLocationType;
import com.equipgrid.maintenance.enums.MaintenancePriority;
import com.equipgrid.maintenance.enums.MaintenanceServiceType;
import com.equipgrid.maintenance.enums.MaintenanceStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaintenanceRecordResponse {

  private Long id;
  private String ticketNumber;

  // Asset details
  private Long assetId;
  private String assetName;
  private String assetSerialNumber;
  private String assetModelName;
  private String assetCategory;
  private String assetImageUrl;
  private String assetStatus;

  // Hub details
  private Long hubId;
  private String hubName;

  // Ticket specifications
  private MaintenanceServiceType serviceType;
  private MaintenanceLocationType locationType;
  private String serviceCenterName;
  private String serviceCenterContact;
  private String serviceCenterAddress;
  private MaintenancePriority priority;
  private MaintenanceStatus status;
  private String issueDescription;
  private String workScope;

  // Periodic Service fields
  private Integer serviceNumber;
  private Boolean isFreeService;
  private String periodicServiceNotes;

  // Repair Work fields
  private java.util.List<String> damagedComponents;
  private String otherDamageDescription;
  private java.util.List<String> damageImageUrls;

  // Financials & Invoices
  private BigDecimal estimatedCost;
  private BigDecimal actualPartsCost;
  private BigDecimal actualLaborCost;
  private BigDecimal totalCost;
  private String invoiceNumber;
  private String invoiceDocumentUrl;
  private String invoiceFileName;
  private String invoiceFileType;
  private OffsetDateTime invoiceUploadedAt;

  // Meter readings & timings
  private Integer meterHoursAtService;
  private Integer nextServiceDueHours;
  private OffsetDateTime startedAt;
  private LocalDate expectedCompletionDate;
  private OffsetDateTime completedAt;
  private String completionNotes;
  private String assignedTechnician;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public static MaintenanceRecordResponse fromEntity(MaintenanceRecord record) {
    if (record == null) return null;
    Asset asset = record.getAsset();
    return MaintenanceRecordResponse.builder()
        .id(record.getId())
        .ticketNumber(record.getTicketNumber())
        .assetId(asset != null ? asset.getId() : null)
        .assetName(asset != null ? asset.getName() : null)
        .assetSerialNumber(asset != null ? asset.getSerialNumber() : null)
        .assetModelName(asset != null ? asset.getModelName() : null)
        .assetCategory(
            asset != null && asset.getCategory() != null ? asset.getCategory().name() : null)
        .assetImageUrl(asset != null ? asset.getImageUrl() : null)
        .assetStatus(asset != null && asset.getStatus() != null ? asset.getStatus().name() : null)
        .hubId(record.getHub() != null ? record.getHub().getId() : null)
        .hubName(record.getHub() != null ? record.getHub().getName() : null)
        .serviceType(record.getServiceType())
        .locationType(record.getLocationType())
        .serviceCenterName(record.getServiceCenterName())
        .serviceCenterContact(record.getServiceCenterContact())
        .serviceCenterAddress(record.getServiceCenterAddress())
        .priority(record.getPriority())
        .status(record.getStatus())
        .issueDescription(record.getIssueDescription())
        .workScope(record.getWorkScope())
        .serviceNumber(record.getServiceNumber())
        .isFreeService(record.getIsFreeService())
        .periodicServiceNotes(record.getPeriodicServiceNotes())
        .damagedComponents(parseJsonList(record.getDamagedComponents()))
        .otherDamageDescription(record.getOtherDamageDescription())
        .damageImageUrls(parseJsonList(record.getDamageImageUrls()))
        .estimatedCost(record.getEstimatedCost())
        .actualPartsCost(record.getActualPartsCost())
        .actualLaborCost(record.getActualLaborCost())
        .totalCost(record.getTotalCost())
        .invoiceNumber(record.getInvoiceNumber())
        .invoiceDocumentUrl(record.getInvoiceDocumentUrl())
        .invoiceFileName(record.getInvoiceFileName())
        .invoiceFileType(record.getInvoiceFileType())
        .invoiceUploadedAt(record.getInvoiceUploadedAt())
        .meterHoursAtService(record.getMeterHoursAtService())
        .nextServiceDueHours(record.getNextServiceDueHours())
        .startedAt(record.getStartedAt())
        .expectedCompletionDate(record.getExpectedCompletionDate())
        .completedAt(record.getCompletedAt())
        .completionNotes(record.getCompletionNotes())
        .assignedTechnician(record.getAssignedTechnician())
        .createdAt(record.getCreatedAt())
        .updatedAt(record.getUpdatedAt())
        .build();
  }

  private static final com.fasterxml.jackson.databind.ObjectMapper MAPPER =
      new com.fasterxml.jackson.databind.ObjectMapper();

  @SuppressWarnings("unchecked")
  private static java.util.List<String> parseJsonList(String json) {
    if (json == null || json.isBlank()) return java.util.Collections.emptyList();
    try {
      return MAPPER.readValue(json, java.util.List.class);
    } catch (Exception e) {
      return java.util.Arrays.stream(json.split(","))
          .map(String::trim)
          .filter(s -> !s.isEmpty())
          .toList();
    }
  }
}
