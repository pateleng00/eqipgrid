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
public class CollectionsReportItem {
  private Long paymentId;
  private String receiptNumber;
  private Long bookingId;
  private String bookingNumber;
  private String customerName;
  private String customerPhone;
  private Long hubId;
  private String hubName;
  private String cityName;
  private String stateName;
  private String paymentMode;
  private String transactionRef;
  private BigDecimal amount;
  private String paymentType;
  private LocalDateTime paymentDate;
  private String collectedBy;
  private String status;
}
