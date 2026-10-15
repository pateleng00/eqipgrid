package com.equipgrid.asset.dto.model;

import com.equipgrid.asset.enums.AssetCategory;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssetSpecsModel {
  private String assetTag;
  private String name;
  private AssetCategory category;
  private BigDecimal dailyRate;
  private BigDecimal depositAmount;
  private Boolean operatorRequired;
}
