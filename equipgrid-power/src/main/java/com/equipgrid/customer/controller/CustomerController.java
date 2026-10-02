package com.equipgrid.customer.controller;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.customer.dto.request.CreateCustomerRequest;
import com.equipgrid.customer.dto.request.VerifyCustomerRequest;
import com.equipgrid.customer.entity.Customer;
import com.equipgrid.customer.service.ICustomerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/customers")
@Tag(name = "Customer Management", description = "Customer onboarding and Tier-1/Tier-2 ID verification (SOP-001)")
public class CustomerController {

    private final ICustomerService customerService;

    public CustomerController(ICustomerService customerService) {
        this.customerService = customerService;
    }

    @GetMapping
    @Operation(summary = "List all registered customers")
    public ResponseEntity<ApiResponse<List<Customer>>> getAllCustomers() {
        return ResponseEntity.ok(ApiResponse.buildSuccess(customerService.getAllCustomers()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get customer by ID")
    public ResponseEntity<ApiResponse<Customer>> getCustomerById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.buildSuccess(customerService.getCustomerById(id)));
    }

    @GetMapping("/phone/{phone}")
    @Operation(summary = "Find customer by mobile phone number")
    public ResponseEntity<ApiResponse<Customer>> getCustomerByPhone(@PathVariable String phone) {
        return ResponseEntity.ok(ApiResponse.buildSuccess(customerService.getCustomerByPhone(phone)));
    }

    @PostMapping
    @Operation(summary = "Register or update customer profile")
    public ResponseEntity<ApiResponse<Customer>> createCustomer(
            @Valid @RequestBody CreateCustomerRequest request,
            Principal principal) {
        String actor = principal != null ? principal.getName() : "BOOKING_DESK";
        Customer saved = customerService.createOrUpdateCustomer(request, actor);
        return ResponseEntity.ok(ApiResponse.buildSuccess("SG-200", "Customer profile saved", saved));
    }

    @PatchMapping("/{id}/verify")
    @Operation(summary = "Update customer verification tier and KYC approval")
    public ResponseEntity<ApiResponse<Customer>> verifyCustomer(
            @PathVariable Long id,
            @RequestBody VerifyCustomerRequest request,
            Principal principal) {
        String actor = principal != null ? principal.getName() : "ADMIN";
        Customer updated = customerService.verifyCustomer(id, request, actor);
        return ResponseEntity.ok(ApiResponse.buildSuccess("SG-200", "Customer verification updated", updated));
    }
}
