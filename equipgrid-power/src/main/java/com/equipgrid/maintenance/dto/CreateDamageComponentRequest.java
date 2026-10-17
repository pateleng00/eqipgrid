package com.equipgrid.maintenance.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateDamageComponentRequest {

  private Long equipmentTypeId;

  private String partCode;

  @NotBlank(message = "Component name is required")
  private String name;

  private String hindiName;

  private String category;

  private String description;

  @Builder.Default private Boolean isUniversal = false;
}
