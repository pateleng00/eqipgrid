package com.equipgrid.asset.dto.request;

import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.asset.enums.BillingUnit;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateAssetRequest {
  private String name;
  private AssetCategory category;
  private Long typeId;
  private Long manufacturerId;
  private Long modelId;
  private Long hubId;
  private String imageUrl;
  private String serialNumber;

  @Positive private BigDecimal dailyRate;

  @PositiveOrZero(message = "Deposit amount must be 0 or positive")
  private BigDecimal depositAmount;

  private BigDecimal purchaseCost;
  private Boolean operatorRequired;
  private String conditionNotes;
  private String accessoriesIncluded;
  private BillingUnit billingUnit;
  private Long billingUnitId;
  private BigDecimal workingHoursLimit;
  private String shiftTerms;
}
