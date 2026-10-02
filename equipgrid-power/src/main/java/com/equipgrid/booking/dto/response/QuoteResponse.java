package com.equipgrid.booking.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

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
}
