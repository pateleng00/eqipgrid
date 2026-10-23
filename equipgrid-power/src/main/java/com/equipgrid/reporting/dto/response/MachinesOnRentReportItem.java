package com.equipgrid.reporting.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MachinesOnRentReportItem {
  private Long assetId;
  private String assetTag;
  private String machineName;
  private String modelName;
  private String category;
  private Long hubId;
  private String hubName;
  private Long cityId;
  private String cityName;
  private Long stateId;
  private String stateName;
  private Long bookingId;
  private String bookingNumber;
  private String customerName;
  private String customerPhone;
  private LocalDate startDate;
  private LocalDate expectedReturnDate;
  private LocalDateTime dispatchTime;
  private BigDecimal dailyRate;
  private String deliveryAddress;
  private Boolean operatorAssigned;
  private String status;
}
