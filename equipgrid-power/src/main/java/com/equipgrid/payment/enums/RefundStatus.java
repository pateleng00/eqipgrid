package com.equipgrid.payment.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum RefundStatus {
    NA((short) 0, "Not Applicable"),
    PENDING((short) 1, "Refund Pending Approval (रिफंड लंबित)"),
    PROCESSING((short) 2, "Refund In Process (रिफंड प्रक्रिया जारी)"),
    COMPLETED((short) 3, "Refund Completed (रिफंड संपन्न)"),
    FAILED((short) 4, "Refund Failed (रिफंड विफल)");

    @JsonValue
    private final Short value;
    private final String description;

    RefundStatus(short value, String description) {
        this.value = value;
        this.description = description;
    }

    public static RefundStatus fromValue(Short value) {
        if (value == null) {
            return NA;
        }
        for (RefundStatus s : RefundStatus.values()) {
            if (s.getValue() != null && s.getValue().equals(value)) {
                return s;
            }
        }
        return NA;
    }

    public static RefundStatus fromValue(String value) {
        if (value == null) {
            return NA;
        }
        for (RefundStatus s : RefundStatus.values()) {
            if (s.name().equalsIgnoreCase(value) || String.valueOf(s.getValue()).equalsIgnoreCase(value)) {
                return s;
            }
        }
        return NA;
    }

    @JsonCreator
    public static RefundStatus jsonCreator(Object obj) {
        if (obj == null) return NA;
        if (obj instanceof Number num) {
            return fromValue(num.shortValue());
        }
        return fromValue(obj.toString());
    }

    @Converter(autoApply = true)
    public static class JpaConverter implements AttributeConverter<RefundStatus, Short> {
        @Override
        public Short convertToDatabaseColumn(RefundStatus attribute) {
            return attribute == null ? null : attribute.getValue();
        }

        @Override
        public RefundStatus convertToEntityAttribute(Short dbData) {
            return RefundStatus.fromValue(dbData);
        }
    }
}
