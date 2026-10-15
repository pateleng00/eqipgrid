package com.equipgrid.farmlocation.dto.request;

import com.equipgrid.farmlocation.enums.FarmLocationType;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class UpsertFarmLocationRequest {
  @NotBlank(message = "Local farm name is required")
  private String localName;

  private String localNameHindi;
  private String aliases;
  private FarmLocationType locationType = FarmLocationType.FARM;
  private BigDecimal latitude;
  private BigDecimal longitude;
  private String village;
  private String tehsil;
  private String district;
  private String landmark;
  private String accessNotes;
  private String deliveryContactName;
  private String deliveryContactPhone;
  private Boolean isDefault = false;
}
