package com.equipgrid.farmlocation.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum FarmLocationType {
    NA((short) 0, "Not Applicable"),
    FARM((short) 1, "Agricultural Farm (खेत)"),
    HOME((short) 2, "Farmer Residence (घर / निवास)"),
    VILLAGE_PICKUP((short) 3, "Common Pickup Point (ग्राम पिकअप स्थल)"),
    SITE((short) 4, "Commercial Site (साइट / कार्यस्थल)");

    @JsonValue
    private final Short value;
    private final String description;

    FarmLocationType(short value, String description) {
        this.value = value;
        this.description = description;
    }

    public static FarmLocationType fromValue(Short value) {
        if (value == null) {
            return NA;
        }
        for (FarmLocationType t : FarmLocationType.values()) {
            if (t.getValue() != null && t.getValue().equals(value)) {
                return t;
            }
        }
        return NA;
    }

    public static FarmLocationType fromValue(String value) {
        if (value == null) {
            return NA;
        }
        for (FarmLocationType t : FarmLocationType.values()) {
            if (t.name().equalsIgnoreCase(value) || String.valueOf(t.getValue()).equalsIgnoreCase(value)) {
                return t;
            }
        }
        return NA;
    }

    @JsonCreator
    public static FarmLocationType jsonCreator(Object obj) {
        if (obj == null) return NA;
        if (obj instanceof Number num) {
            return fromValue(num.shortValue());
        }
        return fromValue(obj.toString());
    }

    @Converter(autoApply = true)
    public static class JpaConverter implements AttributeConverter<FarmLocationType, Short> {
        @Override
        public Short convertToDatabaseColumn(FarmLocationType attribute) {
            return attribute == null ? null : attribute.getValue();
        }

        @Override
        public FarmLocationType convertToEntityAttribute(Short dbData) {
            return FarmLocationType.fromValue(dbData);
        }
    }
}
