package com.equipgrid.rentalconfig.dto.request;

import com.equipgrid.asset.enums.BillingUnit;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateRentalConfigRequest {

  @NotNull(message = "Hub ID is required")
  private Long hubId;

  private Long assetId;

  private Long typeId;

  @NotNull(message = "Base daily rate is required")
  private BigDecimal baseDailyRate;

  @NotNull(message = "Deposit amount is required")
  private BigDecimal depositAmount;

  @Builder.Default private BigDecimal operatorDailyRate = new BigDecimal("500.00");

  @Builder.Default private BigDecimal freeDeliveryDistanceKm = new BigDecimal("5.00");

  @Builder.Default private BigDecimal ratePerKmAfterFree = new BigDecimal("10.00");

  @Builder.Default private BillingUnit billingUnit = BillingUnit.DAILY;

  private Long billingUnitId;

  private BigDecimal workingHoursLimit;

  private String shiftTerms;

  private String notes;
}
