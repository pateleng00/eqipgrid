package com.equipgrid.fulfillment.entity;

import com.equipgrid.booking.entity.Booking;
import com.equipgrid.fulfillment.enums.JobStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "return_pickup_jobs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReturnPickupJob {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @OneToOne(fetch = FetchType.EAGER)
  @JoinColumn(name = "booking_id", nullable = false, unique = true)
  private Booking booking;

  @Column(nullable = false)
  @Builder.Default
  private JobStatus status = JobStatus.REQUESTED;

  private String driverName;
  private String driverPhone;
  private String vehicleNumber;
  private LocalDateTime scheduledFor;
  private LocalDateTime collectedAt;

  @Column(columnDefinition = "TEXT")
  private String pickupNotes;

  @Transient
  public String getStatusDescription() {
    return status != null ? status.getDescription() : null;
  }
}
