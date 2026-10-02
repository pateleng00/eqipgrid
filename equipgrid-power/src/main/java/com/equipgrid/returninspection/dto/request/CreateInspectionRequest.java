package com.equipgrid.returninspection.dto.request;

import com.equipgrid.asset.enums.AssetStatus;
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
public class CreateInspectionRequest {
    @NotNull(message = "Booking ID is required")
    private Long bookingId;

    @Builder.Default
    private String fuelLevelReturn = "100%";

    @Builder.Default
    private BigDecimal fuelDeltaCharge = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal engineHoursIn = BigDecimal.ZERO;

    @Builder.Default
    private Boolean accessoriesReturnedOk = true;

    @Builder.Default
    private Boolean hasDamage = false;

    @Builder.Default
    private BigDecimal damageCost = BigDecimal.ZERO;

    private String damageDescription;

    @NotBlank(message = "Inspector name is required")
    private String inspectorName;

    @Builder.Default
    private AssetStatus nextAction = AssetStatus.AVAILABLE;
}
