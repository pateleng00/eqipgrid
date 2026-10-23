package com.equipgrid.support;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum SupportTicketStatus {
  OPEN((short) 1, "Open (नई पूछताछ)"),
  IN_DISCUSSION((short) 2, "In Discussion (बातचीत जारी)"),
  IN_PROGRESS((short) 3, "In Progress (प्रक्रियाधीन)"),
  RESOLVED((short) 4, "Resolved (हल किया गया)"),
  CLOSED((short) 5, "Closed (बंद किया गया)");

  @JsonValue private final Short value;
  private final String description;

  SupportTicketStatus(short value, String description) {
    this.value = value;
    this.description = description;
  }

  public static SupportTicketStatus fromValue(Short value) {
    if (value == null) {
      return null;
    }
    for (SupportTicketStatus status : SupportTicketStatus.values()) {
      if (status.getValue() != null && status.getValue().equals(value)) {
        return status;
      }
    }
    return null;
  }

  public static SupportTicketStatus fromValue(String value) {
    if (value == null) {
      return null;
    }
    for (SupportTicketStatus status : SupportTicketStatus.values()) {
      if (status.name().equalsIgnoreCase(value)
          || String.valueOf(status.getValue()).equalsIgnoreCase(value)) {
        return status;
      }
    }
    return null;
  }

  @JsonCreator
  public static SupportTicketStatus jsonCreator(Object obj) {
    if (obj == null) return null;
    if (obj instanceof Number num) {
      return fromValue(num.shortValue());
    }
    return fromValue(obj.toString());
  }

  @Converter(autoApply = true)
  public static class JpaConverter implements AttributeConverter<SupportTicketStatus, Short> {
    @Override
    public Short convertToDatabaseColumn(SupportTicketStatus status) {
      return status == null ? null : status.getValue();
    }

    @Override
    public SupportTicketStatus convertToEntityAttribute(Short value) {
      return SupportTicketStatus.fromValue(value);
    }
  }
}
