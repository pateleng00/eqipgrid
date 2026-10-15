package com.equipgrid.auth.otp;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.core.botshield.RequireBotShield;
import com.equipgrid.core.ratelimiter.RateLimited;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Controller handling public website farmer OTP verification before booking creation. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/auth/otp")
@Tag(
    name = "Mobile OTP Verification",
    description = "Farmer phone verification barrier for public online bookings")
public class OtpController {

  private final OtpVerificationService otpService;

  @Operation(
      summary = "Send OTP to mobile phone",
      description =
          "Sends a 6-digit OTP code to the farmer's mobile phone before booking reservation.")
  @PostMapping("/send")
  @RequireBotShield
  @RateLimited(limit = 5, durationSeconds = 600, name = "otp_send")
  public ResponseEntity<ApiResponse<Object>> sendOtp(@Valid @RequestBody OtpSendRequest request) {
    String message = otpService.sendOtp(request.getPhone());
    return ResponseEntity.ok(ApiResponse.buildSuccess(message));
  }

  @Operation(
      summary = "Verify OTP code",
      description =
          "Validates the submitted OTP and returns an ephemeral single-use otpProofToken for booking checkout.")
  @PostMapping("/verify")
  @RateLimited(limit = 10, durationSeconds = 600, name = "otp_verify")
  public ResponseEntity<ApiResponse<OtpVerificationResponse>> verifyOtp(
      @Valid @RequestBody OtpVerifyRequest request) {
    OtpVerificationResponse response = otpService.verifyOtp(request.getPhone(), request.getOtp());
    return ResponseEntity.ok(
        ApiResponse.buildSuccess("Mobile phone verified successfully", response));
  }
}
