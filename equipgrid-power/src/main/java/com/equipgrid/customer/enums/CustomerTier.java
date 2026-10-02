package com.equipgrid.customer.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum CustomerTier {
    NA((short) 0),
    TIER_1_BASIC((short) 1),
    TIER_2_VERIFIED((short) 2);

    @JsonValue
    private final Short value;

    CustomerTier(short value) {
        this.value = value;
    }

    public static CustomerTier fromValue(Short value) {
        if (value == null) {
            return NA;
        }
        for (CustomerTier tier : CustomerTier.values()) {
            if (tier.getValue() != null && tier.getValue().equals(value)) {
                return tier;
            }
        }
        return NA;
    }

    public static CustomerTier fromValue(String value) {
        if (value == null) {
            return NA;
        }
        for (CustomerTier tier : CustomerTier.values()) {
            if (tier.name().equalsIgnoreCase(value) || String.valueOf(tier.getValue()).equalsIgnoreCase(value)) {
                return tier;
            }
        }
        return NA;
    }

    @JsonCreator
    public static CustomerTier jsonCreator(Object obj) {
        if (obj == null) return NA;
        if (obj instanceof Number num) {
            return fromValue(num.shortValue());
        }
        return fromValue(obj.toString());
    }

    @Converter(autoApply = true)
    public static class JpaConverter implements AttributeConverter<CustomerTier, Short> {
        @Override
        public Short convertToDatabaseColumn(CustomerTier tier) {
            return tier == null ? null : tier.getValue();
        }

        @Override
        public CustomerTier convertToEntityAttribute(Short value) {
            return CustomerTier.fromValue(value);
        }
    }
}
