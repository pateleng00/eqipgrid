package com.equipgrid.support;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum SupportTicketPriority {
  LOW((short) 1, "Low Priority (सामान्य / कम प्राथमिकता)"),
  NORMAL((short) 2, "Normal Priority (मध्यम प्राथमिकता)"),
  HIGH((short) 3, "High Priority (उच्च प्राथमिकता)"),
  URGENT((short) 4, "Urgent (अति आवश्यक)");

  @JsonValue private final Short value;
  private final String description;

  SupportTicketPriority(short value, String description) {
    this.value = value;
    this.description = description;
  }

  public static SupportTicketPriority fromValue(Short value) {
    if (value == null) {
      return null;
    }
    for (SupportTicketPriority priority : SupportTicketPriority.values()) {
      if (priority.getValue() != null && priority.getValue().equals(value)) {
        return priority;
      }
    }
    return null;
  }

  public static SupportTicketPriority fromValue(String value) {
    if (value == null) {
      return null;
    }
    for (SupportTicketPriority priority : SupportTicketPriority.values()) {
      if (priority.name().equalsIgnoreCase(value)
          || String.valueOf(priority.getValue()).equalsIgnoreCase(value)) {
        return priority;
      }
    }
    return null;
  }

  @JsonCreator
  public static SupportTicketPriority jsonCreator(Object obj) {
    if (obj == null) return null;
    if (obj instanceof Number num) {
      return fromValue(num.shortValue());
    }
    return fromValue(obj.toString());
  }

  @Converter(autoApply = true)
  public static class JpaConverter implements AttributeConverter<SupportTicketPriority, Short> {
    @Override
    public Short convertToDatabaseColumn(SupportTicketPriority priority) {
      return priority == null ? null : priority.getValue();
    }

    @Override
    public SupportTicketPriority convertToEntityAttribute(Short value) {
      return SupportTicketPriority.fromValue(value);
    }
  }
}
