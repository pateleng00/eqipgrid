package com.equipgrid.asset.controller;

import com.equipgrid.asset.dto.response.AssetMediaResponse;
import com.equipgrid.asset.service.AssetMediaService;
import com.equipgrid.common.dto.rest.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/assets/{id}/media")
@RequiredArgsConstructor
@Tag(name = "Asset Media", description = "Machine image gallery and short video management")
public class AssetMediaController {

    private final AssetMediaService assetMediaService;

    @GetMapping
    @Operation(summary = "List all media (images + video) for an asset")
    public ResponseEntity<ApiResponse<List<AssetMediaResponse>>> listMedia(
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.buildSuccess(assetMediaService.listMedia(id)));
    }

    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
        summary = "Upload a machine image",
        description = "Uploads an image (JPEG/PNG/WebP, max 10 MB) to the asset gallery. " +
                      "Maximum 4 images allowed per machine. Field name: 'file'."
    )
    public ResponseEntity<ApiResponse<AssetMediaResponse>> uploadImage(
            @PathVariable Long id,
            @RequestPart("file") MultipartFile file,
            Principal principal) {
        String actor = principal != null ? principal.getName() : "SYSTEM";
        return ResponseEntity.ok(
                ApiResponse.buildSuccess("Image uploaded", assetMediaService.uploadImage(id, file, actor)));
    }

    @PostMapping(value = "/video", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
        summary = "Upload the machine showcase video",
        description = "Uploads a short video (MP4/WebM, max 30 seconds, max 100 MB). " +
                      "Only 1 video allowed per machine — replaces previous if you delete first. " +
                      "Pass optional 'durationSeconds' as form field."
    )
    public ResponseEntity<ApiResponse<AssetMediaResponse>> uploadVideo(
            @PathVariable Long id,
            @RequestPart("file") MultipartFile file,
            @RequestParam(value = "durationSeconds", required = false) Integer durationSeconds,
            Principal principal) {
        String actor = principal != null ? principal.getName() : "SYSTEM";
        return ResponseEntity.ok(
                ApiResponse.buildSuccess("Video uploaded", assetMediaService.uploadVideo(id, file, durationSeconds, actor)));
    }

    @DeleteMapping("/{mediaId}")
    @Operation(summary = "Delete a media item by ID")
    public ResponseEntity<ApiResponse<Object>> deleteMedia(
            @PathVariable Long id,
            @PathVariable Long mediaId,
            Principal principal) {
        String actor = principal != null ? principal.getName() : "SYSTEM";
        assetMediaService.deleteMedia(id, mediaId, actor);
        return ResponseEntity.ok(ApiResponse.buildSuccess("Media deleted successfully"));
    }
}
