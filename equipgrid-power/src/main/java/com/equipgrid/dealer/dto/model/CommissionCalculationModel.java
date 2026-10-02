package com.equipgrid.dealer.dto.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

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
