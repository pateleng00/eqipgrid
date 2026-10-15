package com.equipgrid.booking.dto.model;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingPricingItem {
  private String description;
  private BigDecimal amount;
  private boolean isTaxable;
}
