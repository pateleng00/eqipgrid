package com.equipgrid.common.storage.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * Request to generate a presigned PUT URL for direct client-to-S3 uploads.
 * Use this for large files (inspection videos, large media) to bypass the application server.
 */
@Getter
@Setter
public class PresignedUploadRequest {

    @NotBlank(message = "File name is required")
    private String fileName;

    @NotBlank(message = "Content type is required (e.g. image/jpeg, video/mp4)")
    private String contentType;
}
