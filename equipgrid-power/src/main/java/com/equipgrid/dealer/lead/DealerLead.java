package com.equipgrid.dealer.lead;

import com.equipgrid.common.BaseEntity;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "dealer_leads")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DealerLead extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "lead_number", nullable = false, unique = true, length = 32)
  private String leadNumber;

  @Column(nullable = false, length = 128)
  private String name;

  @Column(nullable = false, length = 20)
  private String phone;

  @Column(name = "business_name", length = 255)
  private String businessName;

  @Column(nullable = false, length = 100)
  private String district;

  @Column(name = "fleet_count", length = 50)
  private String fleetCount;

  @Column(name = "machine_category", length = 100)
  private String machineCategory;

  @Column(nullable = false)
  @Builder.Default
  private DealerLeadStatus status = DealerLeadStatus.ENQUIRY;

  @Column(columnDefinition = "TEXT")
  private String remarks;

  @Transient
  public String getReviewedBy() {
    return getUpdatedBy() != null ? "User #" + getUpdatedBy() : null;
  }

  @Transient
  public LocalDateTime getReviewedAt() {
    return getUpdatedAt();
  }

  @Transient
  public String getStatusDescription() {
    return status != null ? status.getDescription() : null;
  }
}
