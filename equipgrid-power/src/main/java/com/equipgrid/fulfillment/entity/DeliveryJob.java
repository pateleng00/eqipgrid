package com.equipgrid.fulfillment.entity;

import com.equipgrid.booking.entity.Booking;
import com.equipgrid.fulfillment.enums.JobStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "delivery_jobs") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DeliveryJob {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 @OneToOne(fetch = FetchType.EAGER) @JoinColumn(name = "booking_id", nullable = false, unique = true) private Booking booking;
 @Column(nullable = false) @Builder.Default private JobStatus status = JobStatus.SCHEDULED;
 private String driverName; private String driverPhone; private String vehicleNumber;
 private LocalDateTime scheduledFor; private LocalDateTime etaStart; private LocalDateTime etaEnd; private LocalDateTime deliveredAt;
 private String receiverName; private String receiverPhone;
 @Column(columnDefinition = "TEXT") private String deliveryNotes;
}
