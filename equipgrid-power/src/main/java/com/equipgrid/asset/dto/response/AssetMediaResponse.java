package com.equipgrid.asset.dto.response;

import lombok.Builder;
import lombok.Getter;

/**
 * Response model for a single media item attached to an asset.
 * The {@code url} field is a presigned S3 URL generated at response time.
 */
@Getter
@Builder
public class AssetMediaResponse {

    private Long id;
    private String mediaType;   // "IMAGE" | "VIDEO"
    private String url;         // presigned S3 GET URL
    private String s3Key;
    private Integer displayOrder;
    private String fileName;
    private String contentType;
    private Long fileSizeBytes;
    private Integer durationSeconds;
}
