package com.equipgrid.payment.entity;

import com.equipgrid.booking.entity.Booking;
import com.equipgrid.payment.enums.RefundStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "refund_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefundTransaction {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.EAGER)
  @JoinColumn(name = "booking_id", nullable = false)
  private Booking booking;

  @Column(nullable = false, precision = 10, scale = 2)
  private BigDecimal amount;

  @Column(nullable = false)
  @Builder.Default
  private RefundStatus status = RefundStatus.PENDING;

  private String paymentReference;

  @Column(columnDefinition = "TEXT")
  private String reason;

  @Builder.Default private LocalDateTime initiatedAt = LocalDateTime.now();
  private LocalDateTime completedAt;
}
