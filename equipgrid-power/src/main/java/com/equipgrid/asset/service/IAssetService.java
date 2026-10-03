package com.equipgrid.asset.service;

import com.equipgrid.asset.dto.request.CreateAssetRequest;
import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.asset.enums.AssetStatus;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface IAssetService {
    List<Asset> getAllAssets(AssetCategory category, AssetStatus status);

    Asset getAssetById(Long id);

    Asset getAssetByTag(String tag);

    Asset createAsset(CreateAssetRequest request, String performedBy);

    Asset updateAssetStatus(Long id, AssetStatus newStatus, String notes, String performedBy);

    /**
     * Upload an image for the asset to S3 and persist the resulting URL.
     * Replaces any existing S3-managed image.
     */
    Asset uploadImage(Long id, MultipartFile file, String performedBy);

    /**
     * Get distinct machine models grouped for the customer website catalog.
     */
    List<com.equipgrid.asset.dto.response.WebsiteMachineModelResponse> getWebsiteCatalog(AssetCategory category, Long hubId);
}
