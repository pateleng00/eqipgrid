package com.equipgrid.dispatch.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateDispatchRequest {
    @NotNull(message = "Booking ID is required")
    private Long bookingId;

    @Builder.Default
    private String fuelLevel = "100%";

    @Builder.Default
    private BigDecimal engineHoursOut = BigDecimal.ZERO;

    @Builder.Default
    private Boolean accessoriesVerified = true;

    private String conditionNotes;
    private String photoUrls;

    @NotBlank(message = "Driver or logistics person name is required")
    private String driverName;

    @Builder.Default
    private Boolean customerSignatureConfirmed = true;
}
