package com.equipgrid.common.storage.controller;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.common.storage.dto.request.DownloadRequest;
import com.equipgrid.common.storage.dto.request.PresignedUploadRequest;
import com.equipgrid.common.storage.dto.response.PresignedUploadResponse;
import com.equipgrid.common.storage.service.StorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * REST controller exposing storage endpoints.
 * Mirrors the Stride Observatory StorageController structure.
 *
 * <ul>
 *   <li>{@code POST /api/v1/common/storage/upload}          — multipart upload to tmp bucket</li>
 *   <li>{@code POST /api/v1/common/storage/signed-url}      — presigned GET URL for common bucket</li>
 *   <li>{@code POST /api/v1/common/storage/presigned-upload} — presigned PUT URL for direct client upload</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/common/storage")
@AllArgsConstructor
@Tag(name = "Storage", description = "File upload, presigned URL generation and access management")
public class StorageController {

    private final StorageService storageService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
        summary = "Upload file to temporary bucket",
        description = "Uploads a file (image: jpeg/png/webp/gif, max 10 MB) to the staging bucket. " +
                      "Use the returned URL when creating an asset, then the backend promotes it to permanent storage."
    )
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadFile(
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.buildSuccess(storageService.uploadFileTemporary(file)));
    }

    @PostMapping("/signed-url")
    @Operation(
        summary = "Generate presigned GET URL",
        description = "Returns a time-limited download URL for a file in the common (permanent) bucket."
    )
    public ResponseEntity<ApiResponse<Map<String, String>>> getPreSignedDownloadUrl(
            @Valid @RequestBody DownloadRequest request) {
        return ResponseEntity.ok(
                ApiResponse.buildSuccess(storageService.getPreSignedDownloadUrlFromCommonBucket(request)));
    }

    @PostMapping("/presigned-upload")
    @Operation(
        summary = "Generate presigned PUT URL for direct client upload",
        description = "Returns a presigned S3 PUT URL. The client uploads directly to S3 (bypassing the server), " +
                      "then passes the returned tempUrl back to the domain endpoint to trigger promotion to permanent storage."
    )
    public ResponseEntity<ApiResponse<PresignedUploadResponse>> getPresignedUploadUrl(
            @Valid @RequestBody PresignedUploadRequest request) {
        return ResponseEntity.ok(
                ApiResponse.buildSuccess(storageService.generatePresignedUploadUrl(request)));
    }
}
