package com.equipgrid.whatsapp.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum WhatsAppState {
    NA((short) 0),
    MAIN_MENU((short) 1),
    SELECTING_CATEGORY((short) 2),
    SELECTING_ASSET((short) 3),
    ENTERING_DATES((short) 4),
    ENTERING_LOCATION((short) 5),
    CONFIRMING_BOOKING((short) 6),
    AWAITING_PAYMENT((short) 7),
    TRACKING_ORDER((short) 8),
    REQUESTING_RETURN((short) 9),
    SELECTING_HUB((short) 10),
    SELECTING_DELIVERY_DESTINATION((short) 11),
    /** Processing an incoming voice note via Gemini STT + intent parsing */
    PROCESSING_VOICE((short) 12),
    /** Step-by-step WhatsApp damage checklist during return pickup */
    DAMAGE_CHECKLIST_ACTIVE((short) 13);

    @JsonValue
    private final Short value;

    WhatsAppState(short value) {
        this.value = value;
    }

    public static WhatsAppState fromValue(Short value) {
        if (value == null) {
            return NA;
        }
        for (WhatsAppState state : WhatsAppState.values()) {
            if (state.getValue() != null && state.getValue().equals(value)) {
                return state;
            }
        }
        return NA;
    }

    public static WhatsAppState fromValue(String value) {
        if (value == null) {
            return NA;
        }
        for (WhatsAppState state : WhatsAppState.values()) {
            if (state.name().equalsIgnoreCase(value) || String.valueOf(state.getValue()).equalsIgnoreCase(value)) {
                return state;
            }
        }
        return NA;
    }

    @JsonCreator
    public static WhatsAppState jsonCreator(Object obj) {
        if (obj == null) return NA;
        if (obj instanceof Number num) {
            return fromValue(num.shortValue());
        }
        return fromValue(obj.toString());
    }

    @Converter(autoApply = true)
    public static class JpaConverter implements AttributeConverter<WhatsAppState, Short> {
        @Override
        public Short convertToDatabaseColumn(WhatsAppState state) {
            return state == null ? null : state.getValue();
        }

        @Override
        public WhatsAppState convertToEntityAttribute(Short value) {
            return WhatsAppState.fromValue(value);
        }
    }
}
