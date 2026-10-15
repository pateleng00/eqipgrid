package com.equipgrid.location.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HubRequest {

  @NotNull(message = "City ID is required")
  private Long cityId;

  @NotBlank(message = "Hub name is required")
  private String name;

  @NotBlank(message = "Hub code is required")
  private String code;

  @NotBlank(message = "Hub address is required")
  private String address;

  private String contactPhone;

  @Builder.Default private BigDecimal operatingRadiusKm = new BigDecimal("25.00");

  @NotNull(message = "Latitude is required")
  private BigDecimal latitude;

  @NotNull(message = "Longitude is required")
  private BigDecimal longitude;
}
