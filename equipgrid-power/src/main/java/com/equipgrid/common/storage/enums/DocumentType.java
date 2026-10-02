package com.equipgrid.common.storage.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Classifies every category of stored document / media.
 * Used to derive the S3 object key path:
 * {@code <app-name>/<category.storageName>/<type.storageName>/<identifier>.<ext>}
 *
 * <p>Example: {@code equipgrid-power/asset/images/C-MIX-001_1727902345.jpg}
 */
@Getter
@AllArgsConstructor
public enum DocumentType {

    // ── Asset / Machine images ─────────────────────────────────────────
    ASSET_IMAGE("images", DocumentCategory.ASSET),
    ASSET_DOCUMENT("documents", DocumentCategory.ASSET),

    // ── Inspection media ───────────────────────────────────────────────
    INSPECTION_PHOTO("photos", DocumentCategory.INSPECTION),
    INSPECTION_VIDEO("videos", DocumentCategory.INSPECTION),

    // ── Dispatch / Return challan ──────────────────────────────────────
    DISPATCH_CHALLAN("challans", DocumentCategory.DISPATCH),
    RETURN_CHALLAN("challans", DocumentCategory.RETURN),

    // ── Customer KYC ──────────────────────────────────────────────────
    CUSTOMER_ID_PROOF("id-proof", DocumentCategory.CUSTOMER),
    CUSTOMER_AGREEMENT("agreements", DocumentCategory.CUSTOMER);

    /** S3 folder name for this specific document type. */
    private final String fileStorageName;

    /** Parent category — determines the top-level folder in the object key. */
    private final DocumentCategory documentCategory;
}
