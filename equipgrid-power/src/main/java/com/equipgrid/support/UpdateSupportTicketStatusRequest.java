package com.equipgrid.support;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateSupportTicketStatusRequest {

  @NotNull(message = "Status is required")
  private SupportTicketStatus status;

  private String remarks;

  private String assignedTo;

  private String resolvedBy;
}
