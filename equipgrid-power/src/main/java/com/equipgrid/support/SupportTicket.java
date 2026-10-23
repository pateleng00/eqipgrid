package com.equipgrid.support;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.common.BaseEntity;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "support_tickets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupportTicket extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "ticket_number", nullable = false, unique = true, length = 32)
  private String ticketNumber;

  @Column(name = "customer_name", nullable = false, length = 128)
  private String customerName;

  @Column(name = "customer_phone", nullable = false, length = 20)
  private String customerPhone;

  @Column(nullable = false, length = 64)
  private String topic;

  @Column(columnDefinition = "TEXT")
  private String message;

  @Column(length = 100)
  private String district;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "asset_id")
  private Asset asset;

  @Column(name = "asset_name", length = 255)
  private String assetName;

  @Column(name = "rental_start_date")
  private LocalDate rentalStartDate;

  @Column(name = "rental_end_date")
  private LocalDate rentalEndDate;

  @Column(nullable = false)
  @Builder.Default
  private SupportTicketStatus status = SupportTicketStatus.OPEN;

  @Column(nullable = false)
  @Builder.Default
  private SupportTicketPriority priority = SupportTicketPriority.NORMAL;

  @Column(columnDefinition = "TEXT")
  private String remarks;

  @Column(name = "assigned_to", length = 100)
  private String assignedTo;

  @Column(name = "resolved_by", length = 100)
  private String resolvedBy;

  @Column(name = "resolved_at")
  private LocalDateTime resolvedAt;

  @Transient
  public String getStatusDescription() {
    return status != null ? status.getDescription() : null;
  }

  @Transient
  public String getPriorityDescription() {
    return priority != null ? priority.getDescription() : null;
  }
}
