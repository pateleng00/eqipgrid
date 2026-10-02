package com.equipgrid.dealer.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum CommissionStatus {
    NA((short) 0),
    PENDING((short) 1),
    SETTLED((short) 2);

    @JsonValue
    private final Short value;

    CommissionStatus(short value) {
        this.value = value;
    }

    public static CommissionStatus fromValue(Short value) {
        if (value == null) {
            return NA;
        }
        for (CommissionStatus status : CommissionStatus.values()) {
            if (status.getValue() != null && status.getValue().equals(value)) {
                return status;
            }
        }
        return NA;
    }

    public static CommissionStatus fromValue(String value) {
        if (value == null) {
            return NA;
        }
        for (CommissionStatus status : CommissionStatus.values()) {
            if (status.name().equalsIgnoreCase(value) || String.valueOf(status.getValue()).equalsIgnoreCase(value)) {
                return status;
            }
        }
        return NA;
    }

    @JsonCreator
    public static CommissionStatus jsonCreator(Object obj) {
        if (obj == null) return NA;
        if (obj instanceof Number num) {
            return fromValue(num.shortValue());
        }
        return fromValue(obj.toString());
    }

    @Converter(autoApply = true)
    public static class JpaConverter implements AttributeConverter<CommissionStatus, Short> {
        @Override
        public Short convertToDatabaseColumn(CommissionStatus status) {
            return status == null ? null : status.getValue();
        }

        @Override
        public CommissionStatus convertToEntityAttribute(Short value) {
            return CommissionStatus.fromValue(value);
        }
    }
}
