package com.equipgrid.payment.dto.request;

import com.equipgrid.payment.enums.PaymentType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VerifyProofRequest {
    private BigDecimal amount;
    private PaymentType paymentType;
    private String verifiedBy;
    private String notes;
}
