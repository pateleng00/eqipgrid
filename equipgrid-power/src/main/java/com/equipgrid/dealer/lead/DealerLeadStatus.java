package com.equipgrid.dealer.lead;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum DealerLeadStatus {
  ENQUIRY((short) 1, "Enquiry (नई पूछताछ)"),
  IN_DISCUSSION((short) 2, "In Discussion (बातचीत जारी)"),
  IN_DOCUMENTATION((short) 3, "In Documentation (दस्तावेज जांच)"),
  ONBOARDED((short) 4, "Onboarded (ऑनबोर्डेड)"),
  DENIED((short) 5, "Denied (अस्वीकृत)"),
  CLOSED((short) 6, "Closed (बंद किया गया)");

  @JsonValue private final Short value;
  private final String description;

  DealerLeadStatus(short value, String description) {
    this.value = value;
    this.description = description;
  }

  public static DealerLeadStatus fromValue(Short value) {
    if (value == null) {
      return null;
    }
    for (DealerLeadStatus status : DealerLeadStatus.values()) {
      if (status.getValue() != null && status.getValue().equals(value)) {
        return status;
      }
    }
    return null;
  }

  public static DealerLeadStatus fromValue(String value) {
    if (value == null) {
      return null;
    }
    for (DealerLeadStatus status : DealerLeadStatus.values()) {
      if (status.name().equalsIgnoreCase(value)
          || String.valueOf(status.getValue()).equalsIgnoreCase(value)) {
        return status;
      }
    }
    return null;
  }

  @JsonCreator
  public static DealerLeadStatus jsonCreator(Object obj) {
    if (obj == null) return null;
    if (obj instanceof Number num) {
      return fromValue(num.shortValue());
    }
    return fromValue(obj.toString());
  }

  @Converter(autoApply = true)
  public static class JpaConverter implements AttributeConverter<DealerLeadStatus, Short> {
    @Override
    public Short convertToDatabaseColumn(DealerLeadStatus status) {
      return status == null ? null : status.getValue();
    }

    @Override
    public DealerLeadStatus convertToEntityAttribute(Short value) {
      return DealerLeadStatus.fromValue(value);
    }
  }
}
