package com.equipgrid.payment.controller;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.core.ratelimiter.RateLimited;
import com.equipgrid.payment.dto.request.CompleteRefundRequest;
import com.equipgrid.payment.dto.request.SubmitProofRequest;
import com.equipgrid.payment.dto.request.VerifyProofRequest;
import com.equipgrid.payment.entity.PaymentProof;
import com.equipgrid.payment.entity.RefundTransaction;
import com.equipgrid.payment.service.IPaymentOperationsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/payment-operations")
@Tag(
    name = "Payment Operations",
    description = "Manual payment proof verification and refund settlement execution")
public class PaymentOperationsController {

  private final IPaymentOperationsService paymentOperationsService;

  @PostMapping("/proofs")
  @RateLimited(limit = 20, name = "proof_submit")
  @Operation(summary = "Submit payment proof reference and/or screenshot for booking")
  public ResponseEntity<ApiResponse<PaymentProof>> submitProof(
      @Valid @RequestBody SubmitProofRequest request) {
    PaymentProof saved = paymentOperationsService.submitPaymentProof(request);
    return ResponseEntity.ok(ApiResponse.buildSuccess("Payment proof registered", saved));
  }

  @GetMapping("/proofs")
  @Operation(summary = "Get all pending payment proofs awaiting manual verification")
  public ResponseEntity<ApiResponse<List<PaymentProof>>> pendingProofs() {
    return ResponseEntity.ok(ApiResponse.buildSuccess(paymentOperationsService.getPendingProofs()));
  }

  @PatchMapping("/proofs/{id}/verify")
  @RateLimited(limit = 10, name = "proof_verify")
  @Operation(summary = "Verify customer submitted payment proof and credit advance/deposit")
  public ResponseEntity<ApiResponse<PaymentProof>> verify(
      @PathVariable Long id, @Valid @RequestBody VerifyProofRequest request) {
    PaymentProof verified = paymentOperationsService.verifyPaymentProof(id, request);
    return ResponseEntity.ok(ApiResponse.buildSuccess("Payment verified", verified));
  }

  @GetMapping("/refunds")
  @Operation(summary = "List all refund transactions")
  public ResponseEntity<ApiResponse<List<RefundTransaction>>> refunds() {
    return ResponseEntity.ok(ApiResponse.buildSuccess(paymentOperationsService.getAllRefunds()));
  }

  @PatchMapping("/refunds/{id}/complete")
  @RateLimited(limit = 10, name = "refund_complete")
  @Operation(summary = "Mark refund transaction completed with banking UTR reference")
  public ResponseEntity<ApiResponse<RefundTransaction>> completeRefund(
      @PathVariable Long id, @Valid @RequestBody CompleteRefundRequest request) {
    RefundTransaction completed = paymentOperationsService.completeRefund(id, request);
    return ResponseEntity.ok(ApiResponse.buildSuccess("Refund marked complete", completed));
  }
}
