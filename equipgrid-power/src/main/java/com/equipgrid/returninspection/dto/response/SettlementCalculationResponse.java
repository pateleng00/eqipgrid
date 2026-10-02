package com.equipgrid.returninspection.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SettlementCalculationResponse {
    private Long bookingId;
    private BigDecimal originalDeposit;
    private BigDecimal damageDeduction;
    private BigDecimal fuelDeltaDeduction;
    private BigDecimal netDepositRefundable;
    private String recommendation;
}
