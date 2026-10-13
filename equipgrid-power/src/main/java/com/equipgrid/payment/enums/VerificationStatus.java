package com.equipgrid.payment.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum VerificationStatus {
    NA((short) 0, "Not Applicable"),
    PENDING((short) 1, "Pending Verification (सत्यापन लंबित)"),
    VERIFIED((short) 2, "Verified (सत्यापित)"),
    REJECTED((short) 3, "Rejected (अस्वीकृत)");

    @JsonValue
    private final Short value;
    private final String description;

    VerificationStatus(short value, String description) {
        this.value = value;
        this.description = description;
    }

    public static VerificationStatus fromValue(Short value) {
        if (value == null) {
            return NA;
        }
        for (VerificationStatus s : VerificationStatus.values()) {
            if (s.getValue() != null && s.getValue().equals(value)) {
                return s;
            }
        }
        return NA;
    }

    public static VerificationStatus fromValue(String value) {
        if (value == null) {
            return NA;
        }
        for (VerificationStatus s : VerificationStatus.values()) {
            if (s.name().equalsIgnoreCase(value) || String.valueOf(s.getValue()).equalsIgnoreCase(value)) {
                return s;
            }
        }
        return NA;
    }

    @JsonCreator
    public static VerificationStatus jsonCreator(Object obj) {
        if (obj == null) return NA;
        if (obj instanceof Number num) {
            return fromValue(num.shortValue());
        }
        return fromValue(obj.toString());
    }

    @Converter(autoApply = true)
    public static class JpaConverter implements AttributeConverter<VerificationStatus, Short> {
        @Override
        public Short convertToDatabaseColumn(VerificationStatus attribute) {
            return attribute == null ? null : attribute.getValue();
        }

        @Override
        public VerificationStatus convertToEntityAttribute(Short dbData) {
            return VerificationStatus.fromValue(dbData);
        }
    }
}
