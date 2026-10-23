package com.equipgrid.dealer.lead;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateDealerLeadStatusRequest {

  @NotNull(message = "Status is required")
  private DealerLeadStatus status;

  private String remarks;

  private String reviewedBy;
}
