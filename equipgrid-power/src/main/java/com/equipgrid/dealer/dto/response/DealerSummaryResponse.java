package com.equipgrid.dealer.dto.response;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
