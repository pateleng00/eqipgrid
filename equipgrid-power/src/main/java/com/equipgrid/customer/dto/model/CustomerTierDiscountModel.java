package com.equipgrid.customer.dto.model;

import com.equipgrid.customer.enums.CustomerTier;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerTierDiscountModel {
  private CustomerTier tier;
  private BigDecimal depositWaiverPercentage;
  private BigDecimal rentalDiscountPercentage;
  private boolean eligibleForPostPaid;
}
