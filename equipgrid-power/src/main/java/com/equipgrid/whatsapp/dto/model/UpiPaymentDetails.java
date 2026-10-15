package com.equipgrid.whatsapp.dto.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
