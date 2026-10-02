package com.equipgrid.whatsapp.dto.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UpiPaymentDetails {
    private String payeeVpa;
    private String payeeName;
    private String bookingNumber;
    private BigDecimal amount;
    private String transactionNote;
    private String upiUri;
    private String qrCodeBase64;
    private String qrCodeImageUrl;
}
