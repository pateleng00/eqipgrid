package com.equipgrid.common.storage.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum DocumentCategory {
  ASSET("asset"),
  STATIC("static"),
  MAINTENANCE("maintenance"),
  INSPECTION("inspection"),
  DISPATCH("dispatch"),
  RETURN("return"),
  CUSTOMER("customer");

  private final String fileStorageName;
}
