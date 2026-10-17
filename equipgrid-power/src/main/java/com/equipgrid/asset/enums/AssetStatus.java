package com.equipgrid.asset.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum AssetStatus {
  AVAILABLE((short) 1, "Available in Yard (उपलब्ध)"),
  RESERVED((short) 2, "Reserved for Booking (आरक्षित)"),
  DISPATCH_READY((short) 3, "Ready for Dispatch (रवाना होने को तैयार)"),
  DISPATCHED((short) 4, "Dispatched (रवाना)"),
  ON_RENT((short) 5, "On Rent (खेत पर कार्यरत)"),
  RETURN_PENDING((short) 6, "Return Pending (वापसी लंबित)"),
  RETURNED((short) 7, "Returned to Hub (यार्ड में वापस)"),
  INSPECTION((short) 8, "Under Return Inspection (निरीक्षण जारी)"),
  DAMAGE_ASSESSMENT((short) 9, "Damage Assessment (क्षति आकलन)"),
  MAINTENANCE((short) 10, "Under Maintenance & Repair (मरम्मत जारी)"),
  DAMAGED((short) 11, "Damaged (क्षतिग्रस्त)"),
  RETIRED((short) 12, "Decommissioned / Retired (सेवामुक्त)");

  @JsonValue private final Short value;
  private final String description;

  AssetStatus(short value, String description) {
    this.value = value;
    this.description = description;
  }

  public static AssetStatus fromValue(Short value) {
    if (value == null) {
      return null;
    }
    for (AssetStatus status : AssetStatus.values()) {
      if (status.getValue() != null && status.getValue().equals(value)) {
        return status;
      }
    }
    return null;
  }

  public static AssetStatus fromValue(String value) {
    if (value == null) {
      return null;
    }
    for (AssetStatus status : AssetStatus.values()) {
      if (status.name().equalsIgnoreCase(value)
          || String.valueOf(status.getValue()).equalsIgnoreCase(value)) {
        return status;
      }
    }
    return null;
  }

  @JsonCreator
  public static AssetStatus jsonCreator(Object obj) {
    if (obj == null) return null;
    if (obj instanceof Number num) {
      return fromValue(num.shortValue());
    }
    return fromValue(obj.toString());
  }

  @Converter(autoApply = true)
  public static class JpaConverter implements AttributeConverter<AssetStatus, Short> {
    @Override
    public Short convertToDatabaseColumn(AssetStatus status) {
      return status == null ? null : status.getValue();
    }

    @Override
    public AssetStatus convertToEntityAttribute(Short value) {
      return AssetStatus.fromValue(value);
    }
  }
}
