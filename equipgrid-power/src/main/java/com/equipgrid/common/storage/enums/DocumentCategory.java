package com.equipgrid.common.storage.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Top-level storage category — forms the first segment of the S3 object key
 * after the application name prefix.
 */
@Getter
@AllArgsConstructor
public enum DocumentCategory {

    ASSET("asset"),
    INSPECTION("inspection"),
    DISPATCH("dispatch"),
    RETURN("return"),
    CUSTOMER("customer");

    /** S3 path segment for this category (e.g. {@code "asset"}, {@code "inspection"}). */
    private final String fileStorageName;
}
