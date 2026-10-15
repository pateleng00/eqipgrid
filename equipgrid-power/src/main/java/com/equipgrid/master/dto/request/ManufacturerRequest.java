package com.equipgrid.master.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ManufacturerRequest {

  @NotBlank(message = "Manufacturer name is required")
  private String name;

  @NotBlank(message = "Manufacturer code is required")
  private String code;

  @NotBlank(message = "Country is required")
  @Builder.Default
  private String country = "India";

  @Builder.Default private Boolean active = true;
}
