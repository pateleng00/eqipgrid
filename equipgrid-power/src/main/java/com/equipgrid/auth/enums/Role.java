package com.equipgrid.auth.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum Role {
    NA((short) 0),
    CUSTOMER((short) 1),
    OPERATOR((short) 2),
    TECHNICIAN((short) 3),
    DRIVER((short) 4),
    DEALER((short) 5),
    MANAGER((short) 6),
    ADMIN((short) 7),
    ROOT((short) 8);

    @JsonValue
    private final Short value;

    Role(short value) {
        this.value = value;
    }

    public static Role fromValue(Short value) {
        if (value == null) {
            return NA;
        }
        for (Role r : Role.values()) {
            if (r.getValue() != null && r.getValue().equals(value)) {
                return r;
            }
        }
        return NA;
    }

    public static Role fromValue(String value) {
        if (value == null) {
            return NA;
        }
        for (Role r : Role.values()) {
            if (r.name().equalsIgnoreCase(value) || String.valueOf(r.getValue()).equalsIgnoreCase(value)) {
                return r;
            }
        }
        return NA;
    }

    @JsonCreator
    public static Role jsonCreator(Object obj) {
        if (obj == null) return NA;
        if (obj instanceof Number num) {
            return fromValue(num.shortValue());
        }
        return fromValue(obj.toString());
    }

    @Converter(autoApply = true)
    public static class JpaConverter implements AttributeConverter<Role, Short> {
        @Override
        public Short convertToDatabaseColumn(Role role) {
            return role == null ? null : role.getValue();
        }

        @Override
        public Role convertToEntityAttribute(Short value) {
            return Role.fromValue(value);
        }
    }
}
