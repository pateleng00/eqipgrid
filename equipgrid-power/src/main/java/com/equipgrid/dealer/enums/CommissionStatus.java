package com.equipgrid.dealer.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum CommissionStatus {
  PENDING((short) 1, "Pending (लंबित)"),
  SETTLED((short) 2, "Settled (निपटाया गया)"),
  DECLINED((short) 3, "Declined (अस्वीकृत)");

  @JsonValue private final Short value;
  private final String description;

  CommissionStatus(short value, String description) {
    this.value = value;
    this.description = description;
  }

  public static CommissionStatus fromValue(Short value) {
    if (value == null) {
      return null;
    }
    for (CommissionStatus status : CommissionStatus.values()) {
      if (status.getValue() != null && status.getValue().equals(value)) {
        return status;
      }
    }
    return null;
  }

  public static CommissionStatus fromValue(String value) {
    if (value == null) {
      return null;
    }
    for (CommissionStatus status : CommissionStatus.values()) {
      if (status.name().equalsIgnoreCase(value)
          || String.valueOf(status.getValue()).equalsIgnoreCase(value)) {
        return status;
      }
    }
    return null;
  }

  @JsonCreator
  public static CommissionStatus jsonCreator(Object obj) {
    if (obj == null) return null;
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
