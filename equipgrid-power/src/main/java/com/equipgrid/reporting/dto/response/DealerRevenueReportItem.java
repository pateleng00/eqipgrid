package com.equipgrid.reporting.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DealerRevenueReportItem {
  private Long dealerId;
  private String businessName;
  private String dealerName;
  private String phone;
  private String location;
  private Long cityId;
  private String cityName;
  private Long stateId;
  private String stateName;
  private Long hubId;
  private String hubName;
  private String bookingNumber;
  private String machineName;
  private BigDecimal grossRentalRevenue;
  private BigDecimal commissionRate;
  private BigDecimal commissionAmount;
  private String status;
  private LocalDateTime settledAt;
  private LocalDateTime createdAt;
}
