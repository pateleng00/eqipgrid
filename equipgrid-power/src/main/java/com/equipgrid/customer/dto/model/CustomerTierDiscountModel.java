package com.equipgrid.customer.dto.model;

import com.equipgrid.customer.enums.CustomerTier;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

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
