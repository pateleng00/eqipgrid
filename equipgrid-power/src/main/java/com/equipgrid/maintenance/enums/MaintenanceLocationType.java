package com.equipgrid.maintenance.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum MaintenanceLocationType {
  IN_HOUSE((short) 1, "In-House Workshop (यार्ड वर्कशॉप)"),
  EXTERNAL_SERVICE_CENTER((short) 2, "Service Center (सर्विस सेंटर)");

  @JsonValue private final Short value;
  private final String description;

  MaintenanceLocationType(short value, String description) {
    this.value = value;
    this.description = description;
  }

  public static MaintenanceLocationType fromValue(Short value) {
    if (value == null) {
      return null;
    }
    for (MaintenanceLocationType loc : MaintenanceLocationType.values()) {
      if (loc.getValue() != null && loc.getValue().equals(value)) {
        return loc;
      }
    }
    return null;
  }

  public static MaintenanceLocationType fromValue(String value) {
    if (value == null) {
      return null;
    }
    for (MaintenanceLocationType loc : MaintenanceLocationType.values()) {
      if (loc.name().equalsIgnoreCase(value)
          || String.valueOf(loc.getValue()).equalsIgnoreCase(value)) {
        return loc;
      }
    }
    return null;
  }

  @JsonCreator
  public static MaintenanceLocationType jsonCreator(Object obj) {
    if (obj == null) return null;
    if (obj instanceof Number num) {
      return fromValue(num.shortValue());
    }
    return fromValue(obj.toString());
  }

  @Converter(autoApply = true)
  public static class JpaConverter implements AttributeConverter<MaintenanceLocationType, Short> {
    @Override
    public Short convertToDatabaseColumn(MaintenanceLocationType loc) {
      return loc == null ? null : loc.getValue();
    }

    @Override
    public MaintenanceLocationType convertToEntityAttribute(Short value) {
      return MaintenanceLocationType.fromValue(value);
    }
  }
}
