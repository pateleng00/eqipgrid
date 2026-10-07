package com.equipgrid.customer.dto.request;

import com.equipgrid.customer.enums.CustomerTier;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateCustomerRequest {
    @NotBlank(message = "Customer full name is required")
    private String fullName;

    @NotBlank(message = "Phone number is required")
    private String phone;

    private String email;

    @NotBlank(message = "Address is required")
    private String address;

    private String aadhaarNumber;
    private String gstNumber;

    @Builder.Default
    private CustomerTier tier = CustomerTier.TIER_1_BASIC;

    @Builder.Default
    private Boolean verified = false;

    private String notes;

    private Long hubId;
}
