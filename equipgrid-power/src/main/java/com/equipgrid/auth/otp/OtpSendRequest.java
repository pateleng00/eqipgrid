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
public class OtpSendRequest {

  @NotBlank(message = "Mobile number is required")
  @Pattern(
      regexp = "^(?:\\+91|91)?[6-9]\\d{9}$",
      message = "Invalid 10-digit Indian mobile phone number")
  private String phone;
}
