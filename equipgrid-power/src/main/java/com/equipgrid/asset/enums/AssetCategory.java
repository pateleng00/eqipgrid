package com.equipgrid.asset.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum AssetCategory {
  CONSTRUCTION((short) 1, "Construction & Civil Infrastructure (निर्माण उपकरण)"),
  AGRICULTURE((short) 2, "Agricultural & Farming Machinery (कृषि उपकरण)"),
  MULTIPURPOSE_FLEET((short) 3, "Multipurpose Fleet (बहुउद्देशीय वाहन)");

  @JsonValue private final Short value;
  private final String description;

  AssetCategory(short value, String description) {
    this.value = value;
    this.description = description;
  }

  public static AssetCategory fromValue(Short value) {
    if (value == null) {
      return null;
    }
    for (AssetCategory cat : AssetCategory.values()) {
      if (cat.getValue() != null && cat.getValue().equals(value)) {
        return cat;
      }
    }
    return null;
  }

  public static AssetCategory fromValue(String value) {
    if (value == null) {
      return null;
    }
    for (AssetCategory cat : AssetCategory.values()) {
      if (cat.name().equalsIgnoreCase(value)
          || String.valueOf(cat.getValue()).equalsIgnoreCase(value)) {
        return cat;
      }
    }
    return null;
  }

  @JsonCreator
  public static AssetCategory jsonCreator(Object obj) {
    if (obj == null) return null;
    if (obj instanceof Number num) {
      return fromValue(num.shortValue());
    }
    return fromValue(obj.toString());
  }

  @Converter(autoApply = true)
  public static class JpaConverter implements AttributeConverter<AssetCategory, Short> {
    @Override
    public Short convertToDatabaseColumn(AssetCategory category) {
      return category == null ? null : category.getValue();
    }

    @Override
    public AssetCategory convertToEntityAttribute(Short value) {
      return AssetCategory.fromValue(value);
    }
  }
}
