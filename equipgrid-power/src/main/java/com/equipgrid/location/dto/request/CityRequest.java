package com.equipgrid.location.dto.request;

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
public class CityRequest {

  @NotNull(message = "State ID is required")
  private Long stateId;

  @NotBlank(message = "City name is required")
  private String name;

  private String hindiName;

  private String pinCode;
}
