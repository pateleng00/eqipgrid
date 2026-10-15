package com.equipgrid.returninspection.dto.response;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
