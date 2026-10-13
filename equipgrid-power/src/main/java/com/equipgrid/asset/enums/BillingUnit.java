package com.equipgrid.asset.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;


@Getter
public enum BillingUnit {
    NA((short) 0, "NA", "na", "na", "Not Applicable"),
    DAILY((short) 1, "DAILY", "day", "24-hr day", "Per Day (Daily Shift / 24-hr)"),
    HOURLY((short) 2, "HOURLY", "hr", "hour", "Per Hour (Metered Run Time)"),
    PER_TRIP((short) 3, "PER_TRIP", "trip", "transport trip", "Per Trip (Transportation / Haulage)"),
    PER_HOLE((short) 4, "PER_HOLE", "hole", "hole drilled", "Per Hole (Earth Auger / Drilling)"),
    PER_ACRE((short) 5, "PER_ACRE", "acre", "acre worked", "Per Acre (Field Operation / Harvesting)");

    @JsonValue
    private final Short value;
    private final String code;
    private final String unitLabel;
    private final String unitLabelLong;
    private final String displayName;

    BillingUnit(short value, String code, String unitLabel, String unitLabelLong, String displayName) {
        this.value = value;
        this.code = code;
        this.unitLabel = unitLabel;
        this.unitLabelLong = unitLabelLong;
        this.displayName = displayName;
    }

    public String getDescription() {
        return displayName;
    }

    public static BillingUnit fromValue(Short value) {
        if (value == null) {
            return NA;
        }
        for (BillingUnit unit : BillingUnit.values()) {
            if (unit.getValue() != null && unit.getValue().equals(value)) {
                return unit;
            }
        }
        return NA;
    }

    public static BillingUnit fromValue(String value) {
        if (value == null) {
            return NA;
        }
        String clean = value.trim();
        for (BillingUnit unit : BillingUnit.values()) {
            if (unit.name().equalsIgnoreCase(clean)
                    || unit.getCode().equalsIgnoreCase(clean)
                    || String.valueOf(unit.getValue()).equalsIgnoreCase(clean)) {
                return unit;
            }
        }
        return NA;
    }

    @JsonCreator
    public static BillingUnit jsonCreator(Object obj) {
        if (obj == null) return NA;
        if (obj instanceof Number num) {
            return fromValue(num.shortValue());
        }
        return fromValue(obj.toString());
    }

    @Converter(autoApply = true)
    public static class JpaConverter implements AttributeConverter<BillingUnit, Short> {
        @Override
        public Short convertToDatabaseColumn(BillingUnit unit) {
            return unit == null ? null : unit.getValue();
        }

        @Override
        public BillingUnit convertToEntityAttribute(Short value) {
            return BillingUnit.fromValue(value);
        }
    }
}
