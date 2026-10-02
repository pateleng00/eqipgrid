package com.equipgrid.asset.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum AssetStatus {
    NA((short) 0),
    AVAILABLE((short) 1),
    RESERVED((short) 2),
    DISPATCH_READY((short) 3),
    DISPATCHED((short) 4),
    ON_RENT((short) 5),
    RETURN_PENDING((short) 6),
    RETURNED((short) 7),
    INSPECTION((short) 8),
    DAMAGE_ASSESSMENT((short) 9),
    MAINTENANCE((short) 10),
    DAMAGED((short) 11),
    RETIRED((short) 12);

    @JsonValue
    private final Short value;

    AssetStatus(short value) {
        this.value = value;
    }

    public static AssetStatus fromValue(Short value) {
        if (value == null) {
            return NA;
        }
        for (AssetStatus status : AssetStatus.values()) {
            if (status.getValue() != null && status.getValue().equals(value)) {
                return status;
            }
        }
        return NA;
    }

    public static AssetStatus fromValue(String value) {
        if (value == null) {
            return NA;
        }
        for (AssetStatus status : AssetStatus.values()) {
            if (status.name().equalsIgnoreCase(value) || String.valueOf(status.getValue()).equalsIgnoreCase(value)) {
                return status;
            }
        }
        return NA;
    }

    @JsonCreator
    public static AssetStatus jsonCreator(Object obj) {
        if (obj == null) return NA;
        if (obj instanceof Number num) {
            return fromValue(num.shortValue());
        }
        return fromValue(obj.toString());
    }

    @Converter(autoApply = true)
    public static class JpaConverter implements AttributeConverter<AssetStatus, Short> {
        @Override
        public Short convertToDatabaseColumn(AssetStatus status) {
            return status == null ? null : status.getValue();
        }

        @Override
        public AssetStatus convertToEntityAttribute(Short value) {
            return AssetStatus.fromValue(value);
        }
    }
}
