package com.equipgrid.common.storage.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum DocumentType {
  ASSET_IMAGE("images", DocumentCategory.ASSET),
  ASSET_VIDEO("videos", DocumentCategory.ASSET),
  ASSET_DOCUMENT("documents", DocumentCategory.ASSET),

  STATIC_IMAGE("images", DocumentCategory.STATIC),
  STATIC_VIDEO("videos", DocumentCategory.STATIC),
  STATIC_DOCUMENT("documents", DocumentCategory.STATIC),

  MAINTENANCE_INVOICE("invoices", DocumentCategory.MAINTENANCE),
  MAINTENANCE_IMAGE("images", DocumentCategory.MAINTENANCE),
  MAINTENANCE_DOCUMENT("documents", DocumentCategory.MAINTENANCE),

  INSPECTION_PHOTO("photos", DocumentCategory.INSPECTION),
  INSPECTION_VIDEO("videos", DocumentCategory.INSPECTION),

  DISPATCH_CHALLAN("challans", DocumentCategory.DISPATCH),
  RETURN_CHALLAN("challans", DocumentCategory.RETURN),

  CUSTOMER_ID_PROOF("id-proof", DocumentCategory.CUSTOMER),
  CUSTOMER_AGREEMENT("agreements", DocumentCategory.CUSTOMER);

  private final String fileStorageName;
  private final DocumentCategory documentCategory;
}
