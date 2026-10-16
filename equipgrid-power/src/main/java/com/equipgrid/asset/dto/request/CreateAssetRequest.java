package com.equipgrid.asset.dto.request;

import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.asset.enums.BillingUnit;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class CreateAssetRequest {
  @NotBlank(message = "Asset tag is required (e.g. C-MIX-003)")
  private String assetTag;

  @NotBlank(message = "Name is required")
  private String name;

  @NotNull(message = "Category is required")
  private AssetCategory category;

  @NotNull(message = "Equipment Type selection is required from DB master")
  private Long typeId;

  @NotNull(message = "Manufacturer selection is required from DB master")
  private Long manufacturerId;

  @NotNull(message = "Model selection is required from DB master")
  private Long modelId;

  @NotNull(message = "Hub / Yard station selection is required")
  private Long hubId;

  private String imageUrl;

  private java.util.List<String> galleryImageUrls;

  private String videoUrl;

  private String modelName;
  private String serialNumber;

  @NotNull(message = "Daily rate is required")
  @Positive
  private BigDecimal dailyRate;

  @NotNull(message = "Deposit amount is required (can be 0 for zero deposit)")
  @PositiveOrZero(message = "Deposit amount must be 0 or positive")
  private BigDecimal depositAmount;

  private BigDecimal purchaseCost;

  @Builder.Default private Boolean operatorRequired = false;

  private String conditionNotes;
  private String accessoriesIncluded;

  @Builder.Default private BillingUnit billingUnit = BillingUnit.DAILY;

  private Long billingUnitId;

  private BigDecimal workingHoursLimit;

  private String shiftTerms;
}
