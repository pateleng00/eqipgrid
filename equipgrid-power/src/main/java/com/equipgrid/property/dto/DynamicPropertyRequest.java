package com.equipgrid.property.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DynamicPropertyRequest {

  @NotBlank(message = "Property key is required")
  private String key;

  private String value;

  private String url;
}
