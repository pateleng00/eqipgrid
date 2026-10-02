package com.equipgrid.payment.controller;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.payment.dto.request.RecordPaymentRequest;
import com.equipgrid.payment.entity.Payment;
import com.equipgrid.payment.service.IPaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/payments")
@Tag(name = "Payment & Ledger", description = "SOP-003 Advance collections, security deposits and refunds")
public class PaymentController {

    private final IPaymentService paymentService;

    public PaymentController(IPaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping
    @Operation(summary = "List all payment transactions")
    public ResponseEntity<ApiResponse<List<Payment>>> getAllPayments() {
        return ResponseEntity.ok(ApiResponse.buildSuccess(paymentService.getAllPayments()));
    }

    @GetMapping("/booking/{bookingId}")
    @Operation(summary = "Get all payments associated with a specific booking")
    public ResponseEntity<ApiResponse<List<Payment>>> getPaymentsByBooking(@PathVariable Long bookingId) {
        return ResponseEntity.ok(ApiResponse.buildSuccess(paymentService.getPaymentsByBooking(bookingId)));
    }

    @PostMapping
    @Operation(summary = "Record receipt of advance, deposit or settlement")
    public ResponseEntity<ApiResponse<Payment>> recordPayment(
            @Valid @RequestBody RecordPaymentRequest request,
            Principal principal) {
        String actor = principal != null ? principal.getName() : "CASHIER";
        Payment saved = paymentService.recordPayment(request, actor);
        return ResponseEntity.ok(ApiResponse.buildSuccess("Payment recorded successfully", saved));
    }
}
