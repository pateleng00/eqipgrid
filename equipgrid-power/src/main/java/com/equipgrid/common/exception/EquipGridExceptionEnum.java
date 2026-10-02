package com.equipgrid.common.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum EquipGridExceptionEnum {

    // Standard HTTP responses
    SGO_400("Invalid request. The system detected an issue with the input. Please review and try again."),
    SGO_401("Unauthorized access. Credentials are missing or invalid. Permission denied."),
    SGO_403("Restricted area. You don’t have the necessary rights to access this resource."),
    SGO_404("Resource not found. The item you’re searching for does not exist or is no longer available."),
    SGO_500("Oops! Something went wrong on our end. Hang tight while we fix it!"),

    // Generic exceptions
    SGO_001("New update available. Keep your app up to date for the best experience."),
    SGO_002("Data temporarily unavailable. The requested information is currently inaccessible."),
    SGO_003("OTP mismatch. Please try again."),
    SG0_004("OTP expired. The verification window has closed. Please request a new code."),
    SGO_005("OTP required. Enter the code to proceed with your request."),
    SGO_006("Feature under development. This capability is coming soon, stay tuned."),
    SG_007("Hmm… those contact details don’t look right. Please check the format."),
    SG_008("No data available for the selected criteria."),

    // EquipGrid Domain Specific
    EG_ZERO_CREDIT_VIOLATION("Zero-Open-Credit Violation: %s"),
    EG_ASSET_UNAVAILABLE("Asset is unavailable: %s"),
    EG_BOOKING_CONFLICT("Asset has conflicting bookings during the selected dates."),
    EG_INVALID_STATE_TRANSITION("Invalid state transition from %s to %s"),
    EG_RECORD_NOT_FOUND("Resource not found: %s"),
    EG_BUSINESS_RULE_VIOLATION("Business rule violation: %s");

    private final String message;
}
