package com.equipgrid.auth.otp;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OtpVerifyRequest {

  @NotBlank(message = "Mobile number is required")
  private String phone;

  @NotBlank(message = "OTP code is required")
  @Pattern(regexp = "^\\d{4,6}$", message = "OTP must be 4 to 6 digits")
  private String otp;
}
