package com.equipgrid.dealer.lead;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateDealerLeadRequest {

  @NotBlank(message = "Contact person name is required")
  @Size(min = 5, message = "Name must be at least 5 characters")
  private String name;

  @NotBlank(message = "Phone number is required")
  @Pattern(regexp = "^[6-9]\\d{9}$", message = "Valid 10-digit Indian mobile number required")
  private String phone;

  private String businessName;

  @NotBlank(message = "District / territory location is required")
  private String district;

  private String fleetCount;

  private String machineCategory;
}
