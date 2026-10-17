package com.equipgrid.maintenance.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum MaintenanceServiceType {
  PERIODIC_SERVICE((short) 1, "Periodic / Scheduled Service (नियमित आवधिक सर्विस)"),
  REPAIR_WORK((short) 2, "Breakdown & Damage Repair (खराबी व क्षति मरम्मत)"),
  SERVICE_AND_REPAIR((short) 3, "Service & Component Replacement (सर्विस एवं पुर्जा प्रतिस्थापन)");

  @JsonValue private final Short value;
  private final String description;

  MaintenanceServiceType(short value, String description) {
    this.value = value;
    this.description = description;
  }

  public static MaintenanceServiceType fromValue(Short value) {
    if (value == null) {
      return null;
    }
    for (MaintenanceServiceType type : MaintenanceServiceType.values()) {
      if (type.getValue() != null && type.getValue().equals(value)) {
        return type;
      }
    }
    return null;
  }

  public static MaintenanceServiceType fromValue(String value) {
    if (value == null) {
      return null;
    }
    for (MaintenanceServiceType type : MaintenanceServiceType.values()) {
      if (type.name().equalsIgnoreCase(value)
          || String.valueOf(type.getValue()).equalsIgnoreCase(value)) {
        return type;
      }
    }
    return null;
  }

  @JsonCreator
  public static MaintenanceServiceType jsonCreator(Object obj) {
    if (obj == null) return null;
    if (obj instanceof Number num) {
      return fromValue(num.shortValue());
    }
    return fromValue(obj.toString());
  }

  @Converter(autoApply = true)
  public static class JpaConverter implements AttributeConverter<MaintenanceServiceType, Short> {
    @Override
    public Short convertToDatabaseColumn(MaintenanceServiceType type) {
      return type == null ? null : type.getValue();
    }

    @Override
    public MaintenanceServiceType convertToEntityAttribute(Short value) {
      return MaintenanceServiceType.fromValue(value);
    }
  }
}
