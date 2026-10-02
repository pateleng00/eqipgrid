package com.equipgrid.common.storage.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * Request to generate a presigned GET URL for a file already in the common bucket.
 */
@Getter
@Setter
public class DownloadRequest {

    @NotBlank(message = "S3 object key is required")
    private String key;
}
