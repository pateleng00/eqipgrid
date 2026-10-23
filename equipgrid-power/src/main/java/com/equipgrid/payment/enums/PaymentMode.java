package com.equipgrid.payment.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum PaymentMode {
  CASH((short) 1, "Cash (नकद)"),
  UPI((short) 2, "UPI Code (यूपीआई)"),
  BANK_TRANSFER((short) 3, "Bank Transfer (बैंक ट्रांसफर)");

  @JsonValue private final Short value;
  private final String description;

  PaymentMode(short value, String description) {
    this.value = value;
    this.description = description;
  }

  public static PaymentMode fromValue(Short value) {
    if (value == null) {
      return null;
    }
    for (PaymentMode mode : PaymentMode.values()) {
      if (mode.getValue() != null && mode.getValue().equals(value)) {
        return mode;
      }
    }
    return null;
  }

  public static PaymentMode fromValue(String value) {
    if (value == null) {
      return null;
    }
    for (PaymentMode mode : PaymentMode.values()) {
      if (mode.name().equalsIgnoreCase(value)
          || String.valueOf(mode.getValue()).equalsIgnoreCase(value)) {
        return mode;
      }
    }
    return null;
  }

  @JsonCreator
  public static PaymentMode jsonCreator(Object obj) {
    if (obj == null) return null;
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
