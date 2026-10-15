package com.equipgrid.payment.dto.model;

import com.equipgrid.payment.enums.PaymentMode;
import com.equipgrid.payment.enums.PaymentType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentTransactionModel {
  private Long id;
  private Long bookingId;
  private BigDecimal amount;
  private PaymentType paymentType;
  private PaymentMode paymentMode;
  private String transactionRef;
  private LocalDateTime paymentDate;
}
