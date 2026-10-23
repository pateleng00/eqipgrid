package com.equipgrid.payment.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum PaymentType {
  ADVANCE((short) 1, "Advance Payment (अग्रिम भुगतान)"),
  DEPOSIT((short) 2, "Security Deposit (सुरक्षा राशि)"),
  FINAL_SETTLEMENT((short) 3, "Final Settlement (अंतिम निपटान)"),
  DAMAGE_CHARGE((short) 4, "Damage Charge (क्षति शुल्क)"),
  REFUND((short) 5, "Deposit Refund (जमानत वापसी)");

  @JsonValue private final Short value;
  private final String description;

  PaymentType(short value, String description) {
    this.value = value;
    this.description = description;
  }

  public static PaymentType fromValue(Short value) {
    if (value == null) {
      return null;
    }
    for (PaymentType type : PaymentType.values()) {
      if (type.getValue() != null && type.getValue().equals(value)) {
        return type;
      }
    }
    return null;
  }

  public static PaymentType fromValue(String value) {
    if (value == null) {
      return null;
    }
    for (PaymentType type : PaymentType.values()) {
      if (type.name().equalsIgnoreCase(value)
          || String.valueOf(type.getValue()).equalsIgnoreCase(value)) {
        return type;
      }
    }
    return null;
  }

  @JsonCreator
  public static PaymentType jsonCreator(Object obj) {
    if (obj == null) return null;
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
