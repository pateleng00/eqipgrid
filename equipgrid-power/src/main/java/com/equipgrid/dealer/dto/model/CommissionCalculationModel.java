package com.equipgrid.dealer.dto.model;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommissionCalculationModel {
  private Long dealerId;
  private BigDecimal baseRent;
  private BigDecimal commissionRate;
  private BigDecimal calculatedCommission;
}
