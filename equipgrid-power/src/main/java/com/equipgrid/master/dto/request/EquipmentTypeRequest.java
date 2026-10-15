package com.equipgrid.master.dto.request;

import com.equipgrid.asset.enums.AssetCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EquipmentTypeRequest {

  @NotBlank(message = "Equipment type name is required")
  private String name;

  private String code;

  @NotNull(message = "Asset category is required (AGRICULTURE, CONSTRUCTION, DUAL_USE)")
  private AssetCategory category;

  private String description;

  private String hindiName;

  private String localLanguageName;

  private String hindiDescription;

  @Builder.Default private Boolean active = true;
}
