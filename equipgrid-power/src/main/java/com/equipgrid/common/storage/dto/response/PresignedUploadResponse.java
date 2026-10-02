package com.equipgrid.common.storage.dto.response;

import lombok.Builder;
import lombok.Getter;

/**
 * Response returned when a presigned PUT URL is generated for direct client upload.
 *
 * <ul>
 *   <li>{@code uploadUrl} — presigned S3 PUT URL the client uses to upload directly</li>
 *   <li>{@code tempKey}   — S3 object key in the tmp bucket (for server-side promotion)</li>
 *   <li>{@code tempUrl}   — accessible URL in the tmp bucket (passed back to server for promotion)</li>
 * </ul>
 */
@Getter
@Builder
public class PresignedUploadResponse {

    private final String uploadUrl;
    private final String tempKey;
    private final String tempUrl;
}
