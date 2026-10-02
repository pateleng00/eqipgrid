package com.equipgrid.dealer.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DealerSummaryResponse {
    private Long id;
    private String name;
    private String tradeName;
    private String phone;
    private String location;
    private BigDecimal commissionRate;
    private BigDecimal totalCommissionEarned;
    private long totalReferrals;
}
