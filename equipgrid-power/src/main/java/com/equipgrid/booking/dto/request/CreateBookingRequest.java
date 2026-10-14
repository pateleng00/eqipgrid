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
public class CreateBookingRequest {
    @NotNull(message = "Customer ID is required")
    private Long customerId;

    @NotNull(message = "Asset ID is required")
    private Long assetId;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    @NotNull(message = "Delivery address is required")
    private String deliveryAddress;

    /** Optional saved farm/home/site. When present it supplies the immutable booking location snapshot. */
    private Long farmLocationId;

    @Builder.Default
    private BigDecimal distanceKm = BigDecimal.ZERO;

    @Builder.Default
    private Boolean operatorRequired = false;

    private Long dealerId;
    @Builder.Default
    private com.equipgrid.booking.enums.BookingSource bookingSource = com.equipgrid.booking.enums.BookingSource.STATION;
    @Builder.Default
    private Boolean callbackRequested = false;
    private String notes;

    private Long rentalConfigId;
    private String billingUnit;
    private String shiftTerms;

    /** Single-use signed OTP proof token required for unauthenticated website bookings */
    private String otpProofToken;
}
