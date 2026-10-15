package com.equipgrid.payment.entity;

import com.equipgrid.booking.entity.Booking;
import com.equipgrid.payment.enums.VerificationStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "payment_proofs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentProof {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.EAGER)
  @JoinColumn(name = "booking_id", nullable = false)
  private Booking booking;

  private String submittedReference;

  @Column(nullable = false)
  @Builder.Default
  private VerificationStatus status = VerificationStatus.PENDING;

  @Builder.Default private LocalDateTime submittedAt = LocalDateTime.now();
  private LocalDateTime verifiedAt;
  private String verifiedBy;

  @Column(columnDefinition = "TEXT")
  private String verificationNotes;
}
