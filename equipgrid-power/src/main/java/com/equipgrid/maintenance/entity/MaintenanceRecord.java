package com.equipgrid.maintenance.entity;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.common.BaseEntity;
import com.equipgrid.location.entity.Hub;
import com.equipgrid.maintenance.enums.MaintenanceLocationType;
import com.equipgrid.maintenance.enums.MaintenancePriority;
import com.equipgrid.maintenance.enums.MaintenanceServiceType;
import com.equipgrid.maintenance.enums.MaintenanceStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import lombok.*;

@Entity
@Table(name = "maintenance_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaintenanceRecord extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "ticket_number", nullable = false, unique = true, length = 32)
  private String ticketNumber;

  @ManyToOne(fetch = FetchType.EAGER)
  @JoinColumn(name = "asset_id", nullable = false)
  private Asset asset;

  @ManyToOne(fetch = FetchType.EAGER)
  @JoinColumn(name = "hub_id", nullable = false)
  private Hub hub;

  @Column(name = "service_type", nullable = false)
  private MaintenanceServiceType serviceType;

  @Column(name = "location_type", nullable = false)
  private MaintenanceLocationType locationType;

  @Column(name = "service_center_name", length = 255)
  private String serviceCenterName;

  @Column(name = "service_center_contact", length = 64)
  private String serviceCenterContact;

  @Column(name = "service_center_address", columnDefinition = "TEXT")
  private String serviceCenterAddress;

  @Builder.Default
  @Column(name = "priority", nullable = false)
  private MaintenancePriority priority = MaintenancePriority.NORMAL;

  @Builder.Default
  @Column(name = "status", nullable = false)
  private MaintenanceStatus status = MaintenanceStatus.IN_PROGRESS;

  @Column(name = "issue_description", nullable = false, columnDefinition = "TEXT")
  private String issueDescription;

  @Column(name = "work_scope", columnDefinition = "TEXT")
  private String workScope;

  @Column(name = "service_number")
  private Integer serviceNumber;

  @Builder.Default
  @Column(name = "is_free_service")
  private Boolean isFreeService = false;

  @Column(name = "periodic_service_notes", columnDefinition = "TEXT")
  private String periodicServiceNotes;

  @Column(name = "damaged_components", columnDefinition = "TEXT")
  private String damagedComponents;

  @Column(name = "other_damage_description", columnDefinition = "TEXT")
  private String otherDamageDescription;

  @Column(name = "damage_image_urls", columnDefinition = "TEXT")
  private String damageImageUrls;

  @Column(name = "estimated_cost", precision = 10, scale = 2)
  private BigDecimal estimatedCost;

  @Column(name = "actual_parts_cost", precision = 10, scale = 2)
  private BigDecimal actualPartsCost;

  @Column(name = "actual_labor_cost", precision = 10, scale = 2)
  private BigDecimal actualLaborCost;

  @Column(name = "total_cost", precision = 10, scale = 2)
  private BigDecimal totalCost;

  @Column(name = "invoice_number", length = 64)
  private String invoiceNumber;

  @Column(name = "invoice_document_url", columnDefinition = "TEXT")
  private String invoiceDocumentUrl;

  @Column(name = "invoice_file_name", length = 255)
  private String invoiceFileName;

  @Column(name = "invoice_file_type", length = 64)
  private String invoiceFileType;

  @Column(name = "invoice_uploaded_at")
  private OffsetDateTime invoiceUploadedAt;

  @Column(name = "meter_hours_at_service")
  private Integer meterHoursAtService;

  @Column(name = "next_service_due_hours")
  private Integer nextServiceDueHours;

  @Builder.Default
  @Column(name = "started_at")
  private OffsetDateTime startedAt = OffsetDateTime.now();

  @Column(name = "expected_completion_date")
  private LocalDate expectedCompletionDate;

  @Column(name = "completed_at")
  private OffsetDateTime completedAt;

  @Column(name = "completion_notes", columnDefinition = "TEXT")
  private String completionNotes;

  @Column(name = "assigned_technician", length = 128)
  private String assignedTechnician;

  @Transient
  public String getStatusDescription() {
    return status != null ? status.getDescription() : null;
  }

  @Transient
  public String getPriorityDescription() {
    return priority != null ? priority.getDescription() : null;
  }

  @Transient
  public String getServiceTypeDescription() {
    return serviceType != null ? serviceType.getDescription() : null;
  }
}
