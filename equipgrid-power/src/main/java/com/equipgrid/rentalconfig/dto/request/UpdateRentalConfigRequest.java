package com.equipgrid.rentalconfig.dto.request;

import com.equipgrid.asset.enums.BillingUnit;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateRentalConfigRequest {

    private BigDecimal baseDailyRate;

    private BigDecimal depositAmount;

    private BigDecimal operatorDailyRate;

    private BigDecimal freeDeliveryDistanceKm;

    private BigDecimal ratePerKmAfterFree;

    private BillingUnit billingUnit;

    private Long billingUnitId;

    private BigDecimal workingHoursLimit;

    private String shiftTerms;

    private String notes;
}
