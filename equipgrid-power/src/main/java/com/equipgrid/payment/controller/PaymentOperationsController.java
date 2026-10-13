package com.equipgrid.payment.controller;

import com.equipgrid.booking.entity.Booking;
import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.core.ratelimiter.RateLimited;
import com.equipgrid.payment.dto.request.RecordPaymentRequest;
import com.equipgrid.payment.entity.PaymentProof;
import com.equipgrid.payment.entity.RefundTransaction;
import com.equipgrid.payment.enums.PaymentMode;
import com.equipgrid.payment.enums.PaymentType;
import com.equipgrid.payment.enums.RefundStatus;
import com.equipgrid.payment.enums.VerificationStatus;
import com.equipgrid.payment.repository.PaymentProofRepository;
import com.equipgrid.payment.repository.RefundTransactionRepository;
import com.equipgrid.payment.service.IPaymentService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/payment-operations")
public class PaymentOperationsController {
    private final PaymentProofRepository proofs;
    private final RefundTransactionRepository refunds;
    private final IPaymentService payments;

    @GetMapping("/proofs")
    public ResponseEntity<ApiResponse<List<PaymentProof>>> pendingProofs() {
        return ResponseEntity.ok(ApiResponse.buildSuccess(proofs.findByStatusOrderBySubmittedAtAsc(VerificationStatus.PENDING)));
    }

    @PatchMapping("/proofs/{id}/verify")
    @RateLimited(limit = 10, name = "proof_verify")
    public ResponseEntity<ApiResponse<PaymentProof>> verify(@PathVariable Long id, @RequestBody VerifyProofRequest request) {
        PaymentProof proof = proofs.findById(id).orElseThrow();
        if (proof.getStatus() != VerificationStatus.PENDING) throw new IllegalStateException("Payment proof already reviewed");
        Booking booking = proof.getBooking();
        payments.recordPayment(RecordPaymentRequest.builder()
                        .bookingId(booking.getId())
                        .amount(request.getAmount() == null ? booking.getTotalAmount() : request.getAmount())
                        .paymentType(request.getPaymentType() == null ? PaymentType.ADVANCE : request.getPaymentType())
                        .paymentMode(PaymentMode.UPI)
                        .transactionRef(proof.getSubmittedReference())
                        .notes("Verified payment proof")
                        .build(), request.getVerifiedBy() == null ? "PAYMENT_RECONCILIATION" : request.getVerifiedBy());
        proof.setStatus(VerificationStatus.VERIFIED);
        proof.setVerifiedAt(LocalDateTime.now());
        proof.setVerifiedBy(request.getVerifiedBy());
        proof.setVerificationNotes(request.getNotes());
        return ResponseEntity.ok(ApiResponse.buildSuccess("Payment verified", proofs.save(proof)));
    }

    @GetMapping("/refunds")
    public ResponseEntity<ApiResponse<List<RefundTransaction>>> refunds() {
        return ResponseEntity.ok(ApiResponse.buildSuccess(refunds.findAll()));
    }

    @PatchMapping("/refunds/{id}/complete")
    @RateLimited(limit = 10, name = "refund_complete")
    public ResponseEntity<ApiResponse<RefundTransaction>> completeRefund(@PathVariable Long id, @RequestBody CompleteRefundRequest request) {
        RefundTransaction refund = refunds.findById(id).orElseThrow();
        refund.setStatus(RefundStatus.COMPLETED);
        refund.setPaymentReference(request.getPaymentReference());
        refund.setCompletedAt(LocalDateTime.now());
        return ResponseEntity.ok(ApiResponse.buildSuccess("Refund marked complete", refunds.save(refund)));
    }

    @Data public static class VerifyProofRequest { private BigDecimal amount; private PaymentType paymentType; private String verifiedBy; private String notes; }
    @Data public static class CompleteRefundRequest { private String paymentReference; }
}
