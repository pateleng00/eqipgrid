package com.equipgrid.asset.controller;

import com.equipgrid.asset.dto.request.CreateAssetRequest;
import com.equipgrid.asset.dto.request.UpdateStatusRequest;
import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.asset.enums.AssetStatus;
import com.equipgrid.asset.service.IAssetService;
import com.equipgrid.common.dto.rest.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;

@RestController
@AllArgsConstructor
@RequestMapping("/assets")
@Tag(name = "Asset Management", description = "Equipment catalog, availability and status control")
public class AssetController {

    private final IAssetService assetService;

    @GetMapping
    @Operation(summary = "List all equipment with optional category and status filters")
    public ResponseEntity<ApiResponse<List<Asset>>> listAssets(
            @RequestParam(required = false) AssetCategory category,
            @RequestParam(required = false) AssetStatus status) {
        List<Asset> assets = assetService.getAllAssets(category, status);
        return ResponseEntity.ok(ApiResponse.buildSuccess(assets));
    }

    @GetMapping("/website-catalog")
    @Operation(summary = "Get distinct machine models for website catalog with inventory counts and hubs")
    public ResponseEntity<ApiResponse<List<com.equipgrid.asset.dto.response.WebsiteMachineModelResponse>>> getWebsiteCatalog(
            @RequestParam(required = false) AssetCategory category,
            @RequestParam(required = false) Long hubId) {
        List<com.equipgrid.asset.dto.response.WebsiteMachineModelResponse> catalog = assetService.getWebsiteCatalog(category, hubId);
        return ResponseEntity.ok(ApiResponse.buildSuccess(catalog));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get asset details by ID")
    public ResponseEntity<ApiResponse<Asset>> getAsset(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.buildSuccess(assetService.getAssetById(id)));
    }

    @GetMapping("/tag/{tag}")
    @Operation(summary = "Get asset details by Asset Tag (e.g. C-MIX-001)")
    public ResponseEntity<ApiResponse<Asset>> getAssetByTag(@PathVariable String tag) {
        return ResponseEntity.ok(ApiResponse.buildSuccess(assetService.getAssetByTag(tag)));
    }

    @PostMapping
    @Operation(summary = "Register new machinery into fleet")
    public ResponseEntity<ApiResponse<Asset>> createAsset(@Valid @RequestBody CreateAssetRequest request, Principal principal) {
        String actor = principal != null ? principal.getName() : "ADMIN";
        Asset created = assetService.createAsset(request, actor);
        return ResponseEntity.ok(ApiResponse.buildSuccess("Asset created successfully", created));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Transition asset status (e.g. AVAILABLE, MAINTENANCE, INSPECTION)")
    public ResponseEntity<ApiResponse<Asset>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStatusRequest request,
            Principal principal) {
        String actor = principal != null ? principal.getName() : "STAFF";
        Asset updated = assetService.updateAssetStatus(id, request.getStatus(), request.getConditionNotes(), actor);
        return ResponseEntity.ok(ApiResponse.buildSuccess("Asset status updated", updated));
    }

    @PostMapping(value = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
        summary = "Upload or replace machine image",
        description = "Uploads a JPEG / PNG / WebP image (max 10 MB) to S3 and stores the URL. " +
                      "Replaces any previously uploaded image. Accepts multipart/form-data field: 'file'."
    )
    public ResponseEntity<ApiResponse<Asset>> uploadImage(
            @PathVariable Long id,
            @RequestPart("file") MultipartFile file,
            Principal principal) {
        String actor = principal != null ? principal.getName() : "SYSTEM";
        Asset updated = assetService.uploadImage(id, file, actor);
        return ResponseEntity.ok(ApiResponse.buildSuccess("Image uploaded successfully", updated));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete machinery from fleet (Strictly ROOT only)")
    public ResponseEntity<ApiResponse<Object>> deleteAsset(
            @PathVariable Long id,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.equipgrid.auth.entity.User currentUser) {
        assetService.deleteAsset(id, currentUser);
        return ResponseEntity.ok(ApiResponse.buildSuccess("Machinery deleted successfully"));
    }
}
