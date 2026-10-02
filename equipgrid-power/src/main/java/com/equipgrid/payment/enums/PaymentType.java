package com.equipgrid.payment.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum PaymentType {
    NA((short) 0),
    ADVANCE((short) 1),
    DEPOSIT((short) 2),
    FINAL_SETTLEMENT((short) 3),
    DAMAGE_CHARGE((short) 4),
    REFUND((short) 5);

    @JsonValue
    private final Short value;

    PaymentType(short value) {
        this.value = value;
    }

    public static PaymentType fromValue(Short value) {
        if (value == null) {
            return NA;
        }
        for (PaymentType type : PaymentType.values()) {
            if (type.getValue() != null && type.getValue().equals(value)) {
                return type;
            }
        }
        return NA;
    }

    public static PaymentType fromValue(String value) {
        if (value == null) {
            return NA;
        }
        for (PaymentType type : PaymentType.values()) {
            if (type.name().equalsIgnoreCase(value) || String.valueOf(type.getValue()).equalsIgnoreCase(value)) {
                return type;
            }
        }
        return NA;
    }

    @JsonCreator
    public static PaymentType jsonCreator(Object obj) {
        if (obj == null) return NA;
        if (obj instanceof Number num) {
            return fromValue(num.shortValue());
        }
        return fromValue(obj.toString());
    }

    @Converter(autoApply = true)
    public static class JpaConverter implements AttributeConverter<PaymentType, Short> {
        @Override
        public Short convertToDatabaseColumn(PaymentType type) {
            return type == null ? null : type.getValue();
        }

        @Override
        public PaymentType convertToEntityAttribute(Short value) {
            return PaymentType.fromValue(value);
        }
    }
}
