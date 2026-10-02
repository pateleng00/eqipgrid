package com.equipgrid.customer.dto.request;

import com.equipgrid.customer.enums.CustomerTier;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VerifyCustomerRequest {
    private CustomerTier tier;
    private Boolean verified;
    private String notes;
}
