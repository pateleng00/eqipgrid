package com.equipgrid.reporting.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FutureBookingReportItem {
  private Long bookingId;
  private String bookingNumber;
  private Long assetId;
  private String assetTag;
  private String machineName;
  private String category;
  private Long hubId;
  private String hubName;
  private String cityName;
  private String stateName;
  private BigDecimal dailyRate;
  private Integer rentalDays;
  private LocalDate startDate;
  private LocalDate endDate;
  private String customerName;
  private String customerPhone;
  private String deliveryAddress;
  private String deliveryType;
  private String landmark;
  private BigDecimal totalAmount;
  private BigDecimal depositAmount;
  private BigDecimal advancePaid;
  private String bookingStatus;
}
