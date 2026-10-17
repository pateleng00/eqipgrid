package com.equipgrid.common.storage.controller;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.common.storage.dto.request.DownloadRequest;
import com.equipgrid.common.storage.dto.request.PresignedUploadRequest;
import com.equipgrid.common.storage.dto.response.PresignedUploadResponse;
import com.equipgrid.common.storage.service.StorageService;
import com.equipgrid.core.ratelimiter.RateLimited;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.AllArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/common/storage")
@AllArgsConstructor
@Tag(name = "Storage", description = "File upload, presigned URL generation and access management")
public class StorageController {

  private final StorageService storageService;

  @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @RateLimited(limit = 30, name = "storage_upload")
  @Operation(
      summary = "Upload file to temporary bucket",
      description =
          "Uploads a media file (images up to 15 MB, videos up to 100 MB) to the staging bucket. "
              + "Use the returned URL when creating an asset, then the backend promotes it to permanent storage.")
  public ResponseEntity<ApiResponse<Map<String, Object>>> uploadFile(
      @RequestParam("file") MultipartFile file) {
    return ResponseEntity.ok(ApiResponse.buildSuccess(storageService.uploadFileTemporary(file)));
  }

  @PostMapping("/promote")
  @Operation(
      summary = "Promote temporary media to permanent storage",
      description =
          "Copies a file from the temporary staging bucket to its corresponding dedicated category folder in the permanent bucket.")
  public ResponseEntity<ApiResponse<Map<String, String>>> promoteFile(
      @RequestBody Map<String, String> payload) {
    String tempUrl = payload.get("tempUrl");
    String type = payload.getOrDefault("type", "IMAGE");
    String category = payload.get("category");
    String subFolder = payload.get("subFolder");
    String identifier = payload.getOrDefault("identifier", "doc_" + System.currentTimeMillis());

    StorageService.StoragePromotionResult res;
    if (category != null && !category.isBlank()) {
      res =
          storageService.promoteToPermanentCategoryFolder(
              category, subFolder != null ? subFolder : "images", tempUrl, identifier);
    } else {
      com.equipgrid.common.storage.enums.DocumentType docType = resolveDocumentType(type);
      res = storageService.promoteToPermanentStorage(docType, tempUrl, identifier);
    }

    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            Map.of(
                "url", res.url() != null ? res.url() : "",
                "key", res.key() != null ? res.key() : "")));
  }

  private com.equipgrid.common.storage.enums.DocumentType resolveDocumentType(String type) {
    if (type == null || type.isBlank()) {
      return com.equipgrid.common.storage.enums.DocumentType.ASSET_IMAGE;
    }
    for (com.equipgrid.common.storage.enums.DocumentType dt :
        com.equipgrid.common.storage.enums.DocumentType.values()) {
      if (dt.name().equalsIgnoreCase(type)) {
        return dt;
      }
    }
    String upper = type.toUpperCase();
    if (upper.contains("STATIC") && upper.contains("VID")) {
      return com.equipgrid.common.storage.enums.DocumentType.STATIC_VIDEO;
    }
    if (upper.contains("STATIC")) {
      return com.equipgrid.common.storage.enums.DocumentType.STATIC_IMAGE;
    }
    if (upper.contains("MAINT")
        && (upper.contains("INV") || upper.contains("BILL") || upper.contains("DOC"))) {
      return com.equipgrid.common.storage.enums.DocumentType.MAINTENANCE_INVOICE;
    }
    if (upper.contains("MAINT")) {
      return com.equipgrid.common.storage.enums.DocumentType.MAINTENANCE_IMAGE;
    }
    if (upper.contains("VID")) {
      return com.equipgrid.common.storage.enums.DocumentType.ASSET_VIDEO;
    }
    if (upper.contains("DOC") || upper.contains("PDF")) {
      return com.equipgrid.common.storage.enums.DocumentType.ASSET_DOCUMENT;
    }
    return com.equipgrid.common.storage.enums.DocumentType.ASSET_IMAGE;
  }

  @PostMapping("/signed-url")
  @Operation(
      summary = "Generate presigned GET URL",
      description =
          "Returns a time-limited download URL for a file in the common (permanent) bucket.")
  public ResponseEntity<ApiResponse<Map<String, String>>> getPreSignedDownloadUrl(
      @Valid @RequestBody DownloadRequest request) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(storageService.getPreSignedDownloadUrlFromCommonBucket(request)));
  }

  @PostMapping("/presigned-upload")
  @RateLimited(limit = 10, name = "storage_presign")
  @Operation(
      summary = "Generate presigned PUT URL for direct client upload",
      description =
          "Returns a presigned S3 PUT URL. The client uploads directly to S3 (bypassing the server), "
              + "then passes the returned tempUrl back to the domain endpoint to trigger promotion to permanent storage.")
  public ResponseEntity<ApiResponse<PresignedUploadResponse>> getPresignedUploadUrl(
      @Valid @RequestBody PresignedUploadRequest request) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(storageService.generatePresignedUploadUrl(request)));
  }
}
