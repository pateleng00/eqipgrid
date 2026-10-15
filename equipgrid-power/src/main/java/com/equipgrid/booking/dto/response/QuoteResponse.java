package com.equipgrid.booking.dto.response;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuoteResponse {
  private Long assetId;
  private String assetName;
  private String assetTag;
  private long durationDays;
  private BigDecimal dailyRate;
  private BigDecimal baseRent;
  private BigDecimal deliveryFee;
  private BigDecimal operatorFee;
  private BigDecimal depositAmount;
  private BigDecimal totalAmount;
  private BigDecimal requiredInitialPayment;
  private Long rentalConfigId;
  private String billingUnit;
  private String shiftTerms;
}
