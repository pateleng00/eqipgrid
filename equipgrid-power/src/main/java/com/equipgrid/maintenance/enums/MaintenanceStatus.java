package com.equipgrid.maintenance.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum MaintenanceStatus {
  SCHEDULED((short) 1, "Scheduled (शेड्यूल किया गया)"),
  IN_PROGRESS((short) 2, "In Progress / Under Repair (मरम्मत जारी)"),
  WAITING_PARTS((short) 3, "Waiting for Spare Parts (पुर्जों की प्रतीक्षा)"),
  COMPLETED((short) 4, "Service Completed (सेवा पूर्ण)"),
  CANCELLED((short) 5, "Service Cancelled (रद्द)");

  @JsonValue private final Short value;
  private final String description;

  MaintenanceStatus(short value, String description) {
    this.value = value;
    this.description = description;
  }

  public static MaintenanceStatus fromValue(Short value) {
    if (value == null) {
      return null;
    }
    for (MaintenanceStatus status : MaintenanceStatus.values()) {
      if (status.getValue() != null && status.getValue().equals(value)) {
        return status;
      }
    }
    return null;
  }

  public static MaintenanceStatus fromValue(String value) {
    if (value == null) {
      return null;
    }
    for (MaintenanceStatus status : MaintenanceStatus.values()) {
      if (status.name().equalsIgnoreCase(value)
          || String.valueOf(status.getValue()).equalsIgnoreCase(value)) {
        return status;
      }
    }
    return null;
  }

  @JsonCreator
  public static MaintenanceStatus jsonCreator(Object obj) {
    if (obj == null) return null;
    if (obj instanceof Number num) {
      return fromValue(num.shortValue());
    }
    return fromValue(obj.toString());
  }

  @Converter(autoApply = true)
  public static class JpaConverter implements AttributeConverter<MaintenanceStatus, Short> {
    @Override
    public Short convertToDatabaseColumn(MaintenanceStatus status) {
      return status == null ? null : status.getValue();
    }

    @Override
    public MaintenanceStatus convertToEntityAttribute(Short value) {
      return MaintenanceStatus.fromValue(value);
    }
  }
}
