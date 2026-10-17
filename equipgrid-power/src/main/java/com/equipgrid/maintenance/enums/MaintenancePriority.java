package com.equipgrid.maintenance.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum MaintenancePriority {
  LOW((short) 1, "Low Priority (सामान्य / कम प्राथमिकता)"),
  NORMAL((short) 2, "Normal Priority (मध्यम प्राथमिकता)"),
  HIGH((short) 3, "High Priority (उच्च प्राथमिकता)"),
  URGENT((short) 4, "Urgent / Breakdown (अति आवश्यक)");

  @JsonValue private final Short value;
  private final String description;

  MaintenancePriority(short value, String description) {
    this.value = value;
    this.description = description;
  }

  public static MaintenancePriority fromValue(Short value) {
    if (value == null) {
      return null;
    }
    for (MaintenancePriority priority : MaintenancePriority.values()) {
      if (priority.getValue() != null && priority.getValue().equals(value)) {
        return priority;
      }
    }
    return null;
  }

  public static MaintenancePriority fromValue(String value) {
    if (value == null) {
      return null;
    }
    for (MaintenancePriority priority : MaintenancePriority.values()) {
      if (priority.name().equalsIgnoreCase(value)
          || String.valueOf(priority.getValue()).equalsIgnoreCase(value)) {
        return priority;
      }
    }
    return null;
  }

  @JsonCreator
  public static MaintenancePriority jsonCreator(Object obj) {
    if (obj == null) return null;
    if (obj instanceof Number num) {
      return fromValue(num.shortValue());
    }
    return fromValue(obj.toString());
  }

  @Converter(autoApply = true)
  public static class JpaConverter implements AttributeConverter<MaintenancePriority, Short> {
    @Override
    public Short convertToDatabaseColumn(MaintenancePriority priority) {
      return priority == null ? null : priority.getValue();
    }

    @Override
    public MaintenancePriority convertToEntityAttribute(Short value) {
      return MaintenancePriority.fromValue(value);
    }
  }
}
