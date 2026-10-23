package com.equipgrid.payment.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmitProofRequest {
  private Long bookingId;
  private String bookingNumber;
  private String submittedReference;
  private String proofImageUrl;
  private String notes;
}
