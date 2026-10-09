package com.equipgrid.common.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum EquipGridExceptionEnum {

    // Standard HTTP responses
    EG_400("Invalid request. The system detected an issue with the input. Please review and try again."),
    EG_401("Unauthorized access. Credentials are missing or invalid. Permission denied."),
    EG_403("Restricted area. You don’t have the necessary rights to access this resource."),
    EG_404("Resource not found. The item you’re searching for does not exist or is no longer available."),
    EG_500("Oops! Something went wrong on our end. Hang tight while we fix it!"),

    // EquipGrid Domain Specific
    EG_ZERO_CREDIT_VIOLATION("Zero-Open-Credit Violation: %s"),
    EG_ASSET_UNAVAILABLE("Asset is unavailable: %s"),
    EG_BOOKING_CONFLICT("Asset has conflicting bookings during the selected dates."),
    EG_INVALID_STATE_TRANSITION("Invalid state transition from %s to %s"),
    EG_RECORD_NOT_FOUND("Resource not found: %s"),
    EG_BUSINESS_RULE_VIOLATION("Business rule violation: %s");

    private final String message;
}
