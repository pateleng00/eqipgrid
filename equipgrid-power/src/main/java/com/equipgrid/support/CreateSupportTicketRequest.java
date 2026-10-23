package com.equipgrid.support;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateSupportTicketRequest {

  @NotBlank(message = "Customer name is required")
  @Size(min = 5, message = "Customer name must be at least 5 characters")
  private String customerName;

  @NotBlank(message = "Customer phone is required")
  @Pattern(regexp = "^[6-9]\\d{9}$", message = "Valid 10-digit Indian mobile number required")
  private String customerPhone;

  @NotBlank(message = "Topic / category is required")
  private String topic;

  private String message;

  private String district;

  private Long assetId;

  private String assetName;

  private LocalDate rentalStartDate;

  private LocalDate rentalEndDate;

  private SupportTicketPriority priority;
}
