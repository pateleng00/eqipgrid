package com.equipgrid.whatsapp.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum WhatsAppState {
  MAIN_MENU((short) 1, "Main Menu (मुख्य मेनू)"),
  SELECTING_CATEGORY((short) 2, "Selecting Category (श्रेणी चयन)"),
  SELECTING_ASSET((short) 3, "Selecting Machine (मशीन चयन)"),
  ENTERING_DATES((short) 4, "Entering Rental Dates (तारीख चयन)"),
  ENTERING_LOCATION((short) 5, "Entering Delivery Location (स्थान दर्ज)"),
  CONFIRMING_BOOKING((short) 6, "Confirming Booking (बुकिंग पुष्टि)"),
  AWAITING_PAYMENT((short) 7, "Awaiting Payment (भुगतान प्रतीक्षा)"),
  TRACKING_ORDER((short) 8, "Tracking Order (ऑर्डर ट्रैकिंग)"),
  REQUESTING_RETURN((short) 9, "Requesting Return (वापसी अनुरोध)"),
  SELECTING_HUB((short) 10, "Selecting Station Hub (स्टेशन चयन)"),
  SELECTING_DELIVERY_DESTINATION((short) 11, "Selecting Destination (गंतव्य चयन)"),
  PROCESSING_VOICE((short) 12, "Processing Voice Note (ध्वनि संदेश प्रसंस्करण)"),
  DAMAGE_CHECKLIST_ACTIVE((short) 13, "Damage Checklist Active (क्षति जांच)"),
  SELECTING_TARIFF((short) 14, "Selecting Tariff Plan (किराया दर चयन)");

  @JsonValue private final Short value;
  private final String description;

  WhatsAppState(short value, String description) {
    this.value = value;
    this.description = description;
  }

  public static WhatsAppState fromValue(Short value) {
    if (value == null) {
      return null;
    }
    for (WhatsAppState state : WhatsAppState.values()) {
      if (state.getValue() != null && state.getValue().equals(value)) {
        return state;
      }
    }
    return null;
  }

  public static WhatsAppState fromValue(String value) {
    if (value == null) {
      return null;
    }
    for (WhatsAppState state : WhatsAppState.values()) {
      if (state.name().equalsIgnoreCase(value)
          || String.valueOf(state.getValue()).equalsIgnoreCase(value)) {
        return state;
      }
    }
    return null;
  }

  @JsonCreator
  public static WhatsAppState jsonCreator(Object obj) {
    if (obj == null) return null;
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
