package com.equipgrid.payment.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum PaymentMode {
    NA((short) 0),
    CASH((short) 1),
    UPI((short) 2),
    BANK_TRANSFER((short) 3);

    @JsonValue
    private final Short value;

    PaymentMode(short value) {
        this.value = value;
    }

    public static PaymentMode fromValue(Short value) {
        if (value == null) {
            return NA;
        }
        for (PaymentMode mode : PaymentMode.values()) {
            if (mode.getValue() != null && mode.getValue().equals(value)) {
                return mode;
            }
        }
        return NA;
    }

    public static PaymentMode fromValue(String value) {
        if (value == null) {
            return NA;
        }
        for (PaymentMode mode : PaymentMode.values()) {
            if (mode.name().equalsIgnoreCase(value) || String.valueOf(mode.getValue()).equalsIgnoreCase(value)) {
                return mode;
            }
        }
        return NA;
    }

    @JsonCreator
    public static PaymentMode jsonCreator(Object obj) {
        if (obj == null) return NA;
        if (obj instanceof Number num) {
            return fromValue(num.shortValue());
        }
        return fromValue(obj.toString());
    }

    @Converter(autoApply = true)
    public static class JpaConverter implements AttributeConverter<PaymentMode, Short> {
        @Override
        public Short convertToDatabaseColumn(PaymentMode mode) {
            return mode == null ? null : mode.getValue();
        }

        @Override
        public PaymentMode convertToEntityAttribute(Short value) {
            return PaymentMode.fromValue(value);
        }
    }
}
