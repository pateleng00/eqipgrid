package com.equipgrid.auth.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum Role {
  CUSTOMER((short) 1, "Customer / Farmer (ग्राहक / किसान)"),
  OPERATOR((short) 2, "Machine Operator (मशीन ऑपरेटर)"),
  TECHNICIAN((short) 3, "Maintenance Technician (तकनीशियन)"),
  DRIVER((short) 4, "Logistics Driver (चालक)"),
  DEALER((short) 5, "Village Dealer Partner (डीलर साझेदार)"),
  MANAGER((short) 6, "Station Hub Manager (स्टेशन प्रबंधक)"),
  ADMIN((short) 7, "Platform Administrator (व्यवस्थापक)"),
  ROOT((short) 8, "Super Administrator (मुख्य व्यवस्थापक)");

  @JsonValue private final Short value;
  private final String description;

  Role(short value, String description) {
    this.value = value;
    this.description = description;
  }

  public static Role fromValue(Short value) {
    if (value == null) {
      return null;
    }
    for (Role r : Role.values()) {
      if (r.getValue() != null && r.getValue().equals(value)) {
        return r;
      }
    }
    return null;
  }

  public static Role fromValue(String value) {
    if (value == null) {
      return null;
    }
    for (Role r : Role.values()) {
      if (r.name().equalsIgnoreCase(value)
          || String.valueOf(r.getValue()).equalsIgnoreCase(value)) {
        return r;
      }
    }
    return null;
  }

  @JsonCreator
  public static Role jsonCreator(Object obj) {
    if (obj == null) return null;
    if (obj instanceof Number num) {
      return fromValue(num.shortValue());
    }
    return fromValue(obj.toString());
  }

  @Converter(autoApply = true)
  public static class JpaConverter implements AttributeConverter<Role, Short> {
    @Override
    public Short convertToDatabaseColumn(Role role) {
      return role == null ? null : role.getValue();
    }

    @Override
    public Role convertToEntityAttribute(Short value) {
      return Role.fromValue(value);
    }
  }
}
