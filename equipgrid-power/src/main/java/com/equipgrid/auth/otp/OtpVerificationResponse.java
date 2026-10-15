package com.equipgrid.auth.otp;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OtpVerificationResponse {

  private boolean verified;
  private String phone;
  private String otpProofToken;
  private String message;
}
