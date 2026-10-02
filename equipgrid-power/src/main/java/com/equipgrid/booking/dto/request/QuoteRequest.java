package com.equipgrid.booking.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuoteRequest {
    @NotNull(message = "Asset ID is required")
    private Long assetId;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    @Builder.Default
    private BigDecimal distanceKm = BigDecimal.ZERO;

    @Builder.Default
    private Boolean operatorRequired = false;
}
