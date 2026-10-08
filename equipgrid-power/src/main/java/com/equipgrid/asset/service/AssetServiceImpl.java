package com.equipgrid.asset.service;

import com.equipgrid.asset.dto.request.CreateAssetRequest;
import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.asset.enums.AssetStatus;
import com.equipgrid.asset.repository.AssetQueryRepository;
import com.equipgrid.asset.repository.AssetRepository;
import com.equipgrid.audit.service.IAuditService;
import com.equipgrid.common.Exceptions;
import com.equipgrid.common.storage.enums.DocumentType;
import com.equipgrid.common.storage.service.StorageService;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@AllArgsConstructor
public class AssetServiceImpl implements IAssetService {

    private final AssetRepository assetRepository;
    private final AssetQueryRepository assetQueryRepository;
    private final com.equipgrid.asset.repository.AssetMediaRepository assetMediaRepository;
    private final IAuditService auditService;
    private final StorageService storageService;
    private final com.equipgrid.master.repository.EquipmentTypeRepository equipmentTypeRepository;
    private final com.equipgrid.master.repository.ManufacturerRepository manufacturerRepository;
    private final com.equipgrid.master.repository.MachineModelRepository machineModelRepository;
    private final com.equipgrid.location.repository.HubRepository hubRepository;

    @Override
    public List<Asset> getAllAssets(AssetCategory category, AssetStatus status) {
        List<Asset> assets = assetQueryRepository.fetchAssets(category, status);
        assets.forEach(this::populateMedia);
        return assets;
    }

    @Override
    public Asset getAssetById(Long id) {
        Asset asset = assetQueryRepository.fetchById(id)
                .orElseThrow(() -> new Exceptions.ResourceNotFoundException("Asset not found with ID: " + id));
        populateMedia(asset);
        return asset;
    }

    @Override
    public Asset getAssetByTag(String tag) {
        Asset asset = assetQueryRepository.fetchByAssetTag(tag)
                .orElseThrow(() -> new Exceptions.ResourceNotFoundException("Asset not found with tag: " + tag));
        populateMedia(asset);
        return asset;
    }

    private void populateMedia(Asset asset) {
        if (asset == null || asset.getId() == null) return;
        var mediaList = assetMediaRepository.findByAssetIdOrderByMediaTypeAscDisplayOrderAsc(asset.getId());
        mediaList.forEach(m -> m.setUrl(storageService.createPreSignedFileUrl(m.getS3Key())));
        asset.setMediaItems(mediaList);
    }

    @Override
    @Transactional
    public Asset createAsset(CreateAssetRequest request, String performedBy) {
        if (assetQueryRepository.existsByAssetTag(request.getAssetTag())) {
            throw new Exceptions.BusinessRuleViolationException("Asset tag already exists: " + request.getAssetTag());
        }

        var type = request.getTypeId() != null ? equipmentTypeRepository.findById(request.getTypeId()).orElse(null) : null;
        var manufacturer = request.getManufacturerId() != null ? manufacturerRepository.findById(request.getManufacturerId()).orElse(null) : null;
        var model = request.getModelId() != null ? machineModelRepository.findById(request.getModelId()).orElse(null) : null;
        var hub = request.getHubId() != null ? hubRepository.findById(request.getHubId()).orElse(null) : null;

        Asset asset = Asset.builder()
                .assetTag(request.getAssetTag().toUpperCase().trim())
                .type(type)
                .manufacturer(manufacturer)
                .model(model)
                .hub(hub)
                .imageUrl(request.getImageUrl() != null && !request.getImageUrl().isBlank()
                        ? request.getImageUrl()
                        : "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800")
                .serialNumber(request.getSerialNumber())
                .dailyRate(request.getDailyRate())
                .depositAmount(request.getDepositAmount())
                .purchaseCost(request.getPurchaseCost())
                .operatorRequired(request.getOperatorRequired() != null && request.getOperatorRequired())
                .status(AssetStatus.AVAILABLE)
                .conditionNotes(request.getConditionNotes())
                .accessoriesIncluded(request.getAccessoriesIncluded())
                .build();

        Asset saved = assetRepository.save(asset);
        auditService.log("ASSET", saved.getAssetTag(), "CREATE", performedBy != null ? performedBy : "SYSTEM",
                "Created asset: " + saved.getName());
        return saved;
    }

    @Override
    @Transactional
    public Asset updateAssetStatus(Long id, AssetStatus newStatus, String notes, String performedBy) {
        Asset asset = getAssetById(id);
        AssetStatus oldStatus = asset.getStatus();

        validateStateTransition(oldStatus, newStatus);

        asset.setStatus(newStatus);
        if (notes != null && !notes.isBlank()) {
            asset.setConditionNotes(notes);
        }

        Asset updated = assetRepository.save(asset);
        auditService.log("ASSET", updated.getAssetTag(), "STATUS_CHANGE", performedBy != null ? performedBy : "SYSTEM",
                "Status transitioned from " + oldStatus + " to " + newStatus);
        return updated;
    }

    private void validateStateTransition(AssetStatus from, AssetStatus to) {
        if (from == to) return;

        if (from == AssetStatus.RETIRED) {
            throw new Exceptions.BusinessRuleViolationException("Cannot change status of a retired asset");
        }

        if (from == AssetStatus.ON_RENT && to == AssetStatus.AVAILABLE) {
            throw new Exceptions.BusinessRuleViolationException("On-rent asset must undergo return inspection before becoming available");
        }
    }

    @Override
    @Transactional
    public Asset uploadImage(Long id, MultipartFile file, String performedBy) {
        Asset asset = getAssetById(id);

        // 1. Upload to tmp bucket
        Map<String, String> tmpResult = storageService.uploadFileTemporary(file);
        String tmpUrl = tmpResult.get("url");

        // 2. Promote tmp → permanent via S3-to-S3 copy (no data through server)
        String permanentKey = storageService.copyToPermanentStorage(
                DocumentType.ASSET_IMAGE,
                tmpUrl,
                asset.getAssetTag().toLowerCase() + "_" + System.currentTimeMillis());

        // 3. Build the public permanent URL and persist
        String permanentUrl = storageService.createPreSignedFileUrl(permanentKey);
        asset.setImageUrl(permanentUrl != null ? permanentUrl : tmpUrl);
        Asset saved = assetRepository.save(asset);

        auditService.log("ASSET", asset.getAssetTag(), "IMAGE_UPLOAD",
                performedBy != null ? performedBy : "SYSTEM",
                "Image uploaded to S3: " + permanentKey);

        log.info("[Asset] Image updated for {} -> {}", asset.getAssetTag(), permanentKey);
        return saved;
    }

    private String resolveExtension(String contentType) {
        if (contentType == null) return "jpg";
        return switch (contentType) {
            case "image/png"  -> "png";
            case "image/webp" -> "webp";
            case "image/gif"  -> "gif";
            default           -> "jpg";
        };
    }

    @Override
    public List<com.equipgrid.asset.dto.response.WebsiteMachineModelResponse> getWebsiteCatalog(AssetCategory category, Long hubId) {
        List<Asset> all = assetQueryRepository.fetchAssets(category, null);
        all.forEach(this::populateMedia);

        // Group by distinct machine model name
        Map<String, List<Asset>> grouped = all.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        a -> a.getName() != null ? a.getName().trim() : a.getAssetTag(),
                        java.util.LinkedHashMap::new,
                        java.util.stream.Collectors.toList()
                ));

        List<com.equipgrid.asset.dto.response.WebsiteMachineModelResponse> result = new java.util.ArrayList<>();

        for (Map.Entry<String, List<Asset>> entry : grouped.entrySet()) {
            List<Asset> units = entry.getValue();
            if (units.isEmpty()) continue;

            // If hubId is filtered, check if any unit belongs to this hub
            if (hubId != null) {
                boolean hasHub = units.stream().anyMatch(u -> u.getHub() != null && hubId.equals(u.getHub().getId()));
                if (!hasHub) continue;
            }

            Asset rep = units.stream()
                    .filter(u -> u.getStatus() == AssetStatus.AVAILABLE)
                    .findFirst()
                    .orElse(units.get(0));

            int totalUnits = units.size();
            int availableUnits = (int) units.stream().filter(u -> u.getStatus() == AssetStatus.AVAILABLE).count();

            List<String> hubNames = units.stream()
                    .map(Asset::getHub)
                    .filter(java.util.Objects::nonNull)
                    .map(com.equipgrid.location.entity.Hub::getName)
                    .distinct()
                    .toList();

            List<Long> hubIds = units.stream()
                    .map(Asset::getHub)
                    .filter(java.util.Objects::nonNull)
                    .map(com.equipgrid.location.entity.Hub::getId)
                    .distinct()
                    .toList();

            String demoVideo = null;
            if (rep.getMediaItems() != null) {
                demoVideo = rep.getMediaItems().stream()
                        .filter(m -> "VIDEO".equalsIgnoreCase(m.getMediaType()))
                        .map(com.equipgrid.asset.entity.AssetMedia::getUrl)
                        .findFirst()
                        .orElse(null);
            }

            result.add(com.equipgrid.asset.dto.response.WebsiteMachineModelResponse.builder()
                    .id(rep.getId())
                    .assetTag(rep.getAssetTag())
                    .name(rep.getName())
                    .hindiName(getHindiName(rep.getName()))
                    .category(rep.getCategory())
                    .modelName(rep.getModel() != null ? rep.getModel().getName() : null)
                    .dailyRate(rep.getDailyRate())
                    .depositAmount(rep.getDepositAmount())
                    .imageUrl(rep.getImageUrl())
                    .demoVideoUrl(demoVideo)
                    .mediaItems(rep.getMediaItems())
                    .totalUnits(totalUnits)
                    .availableUnits(availableUnits)
                    .primaryHub(rep.getHub())
                    .availableHubNames(hubNames)
                    .availableHubIds(hubIds)
                    .build());
        }

        return result;
    }

    private String getHindiName(String name) {
        if (name == null) return "";
        String upper = name.toUpperCase();
        if (upper.contains("MIX")) return "कंक्रीट मिलाने की मशीन (Concrete Mixer)";
        if (upper.contains("VIBRAT")) return "कंक्रीट बैठाने/कंपन की मशीन (Concrete Vibrator)";
        if (upper.contains("COMPACT") || upper.contains("RAMMER")) return "मिट्टी व रोड़ी कुटाई/दबाने की मशीन (Plate Compactor)";
        if (upper.contains("JACKHAMMER") || upper.contains("BREAKER")) return "कंक्रीट व पत्थर तोड़ने की मशीन (Demolition Jackhammer)";
        if (upper.contains("PUMP") || upper.contains("TRASH")) return "पानी व कीचड़ निकालने का पम्प (Dewatering Trash Pump)";
        if (upper.contains("GEN") || upper.contains("POWER")) return "बिजली जनरेटर (Portable Power Generator)";
        if (upper.contains("WEED") || upper.contains("ROTARY")) return "खेत की जुताई व निराई-गुड़ाई की मशीन (Power Weeder)";
        if (upper.contains("REAP") || upper.contains("HARVEST")) return "फसल/धान व गेहूँ काटने की मशीन (Crop Power Reaper)";
        if (upper.contains("AUGER") || upper.contains("HOLE")) return "जमीन में गड्ढा खोदने की मशीन (Post-Hole Earth Auger)";
        return name;
    }

    @Override
    @Transactional
    public void deleteAsset(Long id, com.equipgrid.auth.entity.User caller) {
        if (caller != null && caller.getRole() != null && caller.getRole() != com.equipgrid.auth.enums.Role.ROOT) {
            throw new Exceptions.BusinessRuleViolationException(
                    "Forbidden: Only Root administrators can delete machinery from the fleet. Admins and Managers cannot delete machines.");
        }

        Asset asset = assetRepository.findById(id)
                .orElseThrow(() -> new Exceptions.ResourceNotFoundException("Asset not found with ID: " + id));

        assetRepository.delete(asset);
        log.info("Asset {} (Tag: {}) deleted by actor: {}", id, asset.getAssetTag(), caller != null ? caller.getUsername() : "ROOT");
    }
}
