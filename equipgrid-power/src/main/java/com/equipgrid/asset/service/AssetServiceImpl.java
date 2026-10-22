package com.equipgrid.asset.service;

import com.equipgrid.asset.dto.request.CreateAssetRequest;
import com.equipgrid.asset.dto.response.WebsiteMachineModelResponse;
import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.entity.AssetMedia;
import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.asset.enums.AssetStatus;
import com.equipgrid.asset.enums.BillingUnit;
import com.equipgrid.asset.repository.AssetMediaRepository;
import com.equipgrid.asset.repository.AssetQueryRepository;
import com.equipgrid.asset.repository.AssetRepository;
import com.equipgrid.audit.service.IAuditService;
import com.equipgrid.auth.enums.Role;
import com.equipgrid.common.Exceptions;
import com.equipgrid.common.storage.enums.DocumentType;
import com.equipgrid.common.storage.service.StorageService;
import com.equipgrid.intelligence.service.IAssetVectorEmbeddingService;
import com.equipgrid.location.repository.HubRepository;
import com.equipgrid.master.repository.BillingUnitMasterRepository;
import com.equipgrid.master.repository.EquipmentTypeRepository;
import com.equipgrid.master.repository.MachineModelRepository;
import com.equipgrid.master.repository.ManufacturerRepository;
import com.equipgrid.rentalconfig.repository.RentalConfigurationQueryRepository;
import com.equipgrid.rentalconfig.repository.RentalConfigurationRepository;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@AllArgsConstructor
public class AssetServiceImpl implements IAssetService {

  private final AssetRepository assetRepository;
  private final AssetQueryRepository assetQueryRepository;
  private final AssetMediaRepository assetMediaRepository;
  private final IAuditService auditService;
  private final StorageService storageService;
  private final EquipmentTypeRepository equipmentTypeRepository;
  private final ManufacturerRepository manufacturerRepository;
  private final MachineModelRepository machineModelRepository;
  private final HubRepository hubRepository;
  private final BillingUnitMasterRepository billingUnitMasterRepository;
  private final RentalConfigurationRepository rentalConfigurationRepository;
  private final RentalConfigurationQueryRepository rentalConfigurationQueryRepository;
  private final IAssetVectorEmbeddingService assetVectorEmbeddingService;

  @Override
  public List<Asset> getAllAssets(AssetCategory category, AssetStatus status) {
    List<Asset> assets = assetQueryRepository.fetchAssets(category, status);
    assets.forEach(
        a -> {
          populateMedia(a);
          populateRentalPricing(a);
        });
    return assets;
  }

  @Override
  public Asset getAssetById(Long id) {
    Asset asset =
        assetQueryRepository
            .fetchById(id)
            .orElseThrow(
                () -> new Exceptions.ResourceNotFoundException("Asset not found with ID: " + id));
    populateMedia(asset);
    populateRentalPricing(asset);
    return asset;
  }

  @Override
  public Asset getAssetByTag(String tag) {
    Asset asset =
        assetQueryRepository
            .fetchByAssetTag(tag)
            .orElseThrow(
                () -> new Exceptions.ResourceNotFoundException("Asset not found with tag: " + tag));
    populateMedia(asset);
    populateRentalPricing(asset);
    return asset;
  }

  private void populateRentalPricing(Asset asset) {
    if (asset == null || asset.getId() == null) return;
    Long hId = asset.getHub() != null ? asset.getHub().getId() : 0L;
    var configs = rentalConfigurationQueryRepository.fetchByAssetIdAndHubId(asset.getId(), hId);
    if (!configs.isEmpty()) {
      var cfg = configs.get(0);
      asset.setDailyRate(cfg.getBaseDailyRate());
      asset.setDepositAmount(cfg.getDepositAmount());
      if (cfg.getBillingUnit() != null) asset.setBillingUnit(cfg.getBillingUnit());
      if (cfg.getBillingUnitMaster() != null)
        asset.setBillingUnitMaster(cfg.getBillingUnitMaster());
      if (cfg.getShiftTerms() != null && !cfg.getShiftTerms().isBlank()) {
        asset.setShiftTerms(cfg.getShiftTerms());
      }
      if (cfg.getWorkingHoursLimit() != null) {
        asset.setWorkingHoursLimit(cfg.getWorkingHoursLimit());
      }
    } else if (asset.getType() != null && asset.getHub() != null) {
      configs =
          rentalConfigurationQueryRepository.fetchByTypeIdAndHubId(
              asset.getType().getId(), asset.getHub().getId());
      if (!configs.isEmpty()) {
        var cfg = configs.get(0);
        asset.setDailyRate(cfg.getBaseDailyRate());
        asset.setDepositAmount(cfg.getDepositAmount());
        if (cfg.getBillingUnit() != null) asset.setBillingUnit(cfg.getBillingUnit());
        if (cfg.getBillingUnitMaster() != null)
          asset.setBillingUnitMaster(cfg.getBillingUnitMaster());
        if (cfg.getShiftTerms() != null && !cfg.getShiftTerms().isBlank()) {
          asset.setShiftTerms(cfg.getShiftTerms());
        }
        if (cfg.getWorkingHoursLimit() != null) {
          asset.setWorkingHoursLimit(cfg.getWorkingHoursLimit());
        }
      }
    }
  }

  private void populateMedia(Asset asset) {
    if (asset == null || asset.getId() == null) return;
    var mediaList = assetQueryRepository.fetchMediaByAssetId(asset.getId());
    mediaList.forEach(m -> m.setUrl(storageService.createPreSignedFileUrl(m.getS3Key())));
    asset.setMediaItems(mediaList);
  }

  @Override
  @Transactional
  public Asset createAsset(CreateAssetRequest request, String performedBy) {
    if (assetQueryRepository.existsByAssetTag(request.getAssetTag())) {
      throw new Exceptions.BusinessRuleViolationException(
          "Asset tag already exists: " + request.getAssetTag());
    }

    var type =
        request.getTypeId() != null
            ? equipmentTypeRepository.findById(request.getTypeId()).orElse(null)
            : null;
    var manufacturer =
        request.getManufacturerId() != null
            ? manufacturerRepository.findById(request.getManufacturerId()).orElse(null)
            : null;
    var model =
        request.getModelId() != null
            ? machineModelRepository.findById(request.getModelId()).orElse(null)
            : null;
    var hub =
        request.getHubId() != null ? hubRepository.findById(request.getHubId()).orElse(null) : null;

    String initialImage =
        request.getImageUrl() != null && !request.getImageUrl().isBlank()
            ? request.getImageUrl()
            : (request.getGalleryImageUrls() != null && !request.getGalleryImageUrls().isEmpty()
                ? request.getGalleryImageUrls().get(0)
                : null);

    String resolvedName =
        request.getName() != null && !request.getName().isBlank()
            ? request.getName().trim()
            : (model != null && model.getName() != null
                ? model.getName()
                : (type != null && type.getName() != null
                    ? type.getName()
                    : request.getAssetTag()));

    String resolvedModelName =
        request.getModelName() != null && !request.getModelName().isBlank()
            ? request.getModelName().trim()
            : (model != null ? model.getName() : null);

    AssetCategory resolvedCategory =
        request.getCategory() != null
            ? request.getCategory()
            : (type != null && type.getCategory() != null
                ? type.getCategory()
                : (model != null && model.getType() != null && model.getType().getCategory() != null
                    ? model.getType().getCategory()
                    : AssetCategory.CONSTRUCTION));

    Asset asset =
        Asset.builder()
            .assetTag(request.getAssetTag().toUpperCase().trim())
            .name(resolvedName)
            .category(resolvedCategory)
            .modelName(resolvedModelName)
            .type(type)
            .manufacturer(manufacturer)
            .model(model)
            .hub(hub)
            .imageUrl(initialImage)
            .serialNumber(request.getSerialNumber())
            .dailyRate(request.getDailyRate())
            .depositAmount(request.getDepositAmount())
            .purchaseCost(request.getPurchaseCost())
            .operatorRequired(
                request.getOperatorRequired() != null && request.getOperatorRequired())
            .status(AssetStatus.AVAILABLE)
            .conditionNotes(request.getConditionNotes())
            .accessoriesIncluded(request.getAccessoriesIncluded())
            .billingUnit(
                request.getBillingUnit() != null ? request.getBillingUnit() : BillingUnit.DAILY)
            .workingHoursLimit(request.getWorkingHoursLimit())
            .shiftTerms(request.getShiftTerms())
            .build();

    if (request.getBillingUnitId() != null) {
      billingUnitMasterRepository
          .findById(request.getBillingUnitId())
          .ifPresent(
              bu -> {
                asset.setBillingUnitMaster(bu);
                asset.setBillingUnit(BillingUnit.fromValue(bu.getCode()));
                if (asset.getShiftTerms() == null || asset.getShiftTerms().isBlank()) {
                  asset.setShiftTerms(bu.getDefaultShiftTerms());
                }
              });
    }

    Asset saved = assetRepository.save(asset);

    // Process and promote staged gallery images (from tmp bucket to permanent bucket)
    List<String> gallery = request.getGalleryImageUrls();
    if (gallery != null && !gallery.isEmpty()) {
      if (gallery.size() > 10) {
        throw new Exceptions.BusinessRuleViolationException(
            "Maximum 10 images allowed per machine");
      }
      String primaryPermUrl = null;
      for (int i = 0; i < gallery.size(); i++) {
        String rawUrl = gallery.get(i);
        if (rawUrl == null || rawUrl.isBlank()) continue;

        String identifier =
            saved.getAssetTag().toLowerCase()
                + "_img_"
                + (i + 1)
                + "_"
                + System.currentTimeMillis();
        var promo =
            storageService.promoteToPermanentStorage(DocumentType.ASSET_IMAGE, rawUrl, identifier);

        AssetMedia media =
            AssetMedia.builder()
                .asset(saved)
                .mediaType("IMAGE")
                .s3Key(promo.key() != null ? promo.key() : promo.url())
                .displayOrder(i)
                .fileName(saved.getAssetTag() + "_img_" + (i + 1))
                .contentType("image/jpeg")
                .build();
        assetMediaRepository.save(media);

        if (i == 0 && promo.url() != null) {
          primaryPermUrl = promo.url();
        }
      }
      if (primaryPermUrl != null) {
        saved.setImageUrl(primaryPermUrl);
        assetRepository.save(saved);
      }
    } else if (request.getImageUrl() != null && !request.getImageUrl().isBlank()) {
      String rawUrl = request.getImageUrl();
      String identifier =
          saved.getAssetTag().toLowerCase() + "_img_1_" + System.currentTimeMillis();
      var promo =
          storageService.promoteToPermanentStorage(DocumentType.ASSET_IMAGE, rawUrl, identifier);

      AssetMedia media =
          AssetMedia.builder()
              .asset(saved)
              .mediaType("IMAGE")
              .s3Key(promo.key() != null ? promo.key() : promo.url())
              .displayOrder(0)
              .fileName(saved.getAssetTag() + "_img_1")
              .contentType("image/jpeg")
              .build();
      assetMediaRepository.save(media);

      if (promo.url() != null && !promo.url().equals(rawUrl)) {
        saved.setImageUrl(promo.url());
        assetRepository.save(saved);
      }
    }

    // Process and promote staged demonstration video (from tmp bucket to permanent bucket)
    if (request.getVideoUrl() != null && !request.getVideoUrl().isBlank()) {
      String rawVideo = request.getVideoUrl().trim();
      String identifier = saved.getAssetTag().toLowerCase() + "_vid_" + System.currentTimeMillis();
      var promo =
          storageService.promoteToPermanentStorage(
              DocumentType.ASSET_DOCUMENT, rawVideo, identifier);

      AssetMedia videoMedia =
          AssetMedia.builder()
              .asset(saved)
              .mediaType("VIDEO")
              .s3Key(promo.key() != null ? promo.key() : promo.url())
              .displayOrder(0)
              .fileName(saved.getAssetTag() + "_video")
              .contentType("video/mp4")
              .build();
      assetMediaRepository.save(videoMedia);
    }

    populateMedia(saved);
    populateRentalPricing(saved);

    auditService.log(
        "ASSET",
        saved.getAssetTag(),
        "CREATE",
        performedBy != null ? performedBy : "SYSTEM",
        "Created asset: " + saved.getName());

    // Automatically generate and persist 768-dim vector embedding asynchronously
    try {
      CompletableFuture.runAsync(
          () -> {
            try {
              assetVectorEmbeddingService.updateAssetEmbedding(saved.getId());
            } catch (Exception ex) {
              log.warn(
                  "[AssetService] Automatic vector embedding generation failed for new asset ID={}: {}",
                  saved.getId(),
                  ex.getMessage());
            }
          });
    } catch (Exception e) {
      log.warn(
          "[AssetService] Could not schedule vector embedding generation for new asset ID={}: {}",
          saved.getId(),
          e.getMessage());
    }

    return saved;
  }

  @Override
  @Transactional
  public Asset updateAsset(
      Long id, com.equipgrid.asset.dto.request.UpdateAssetRequest request, String performedBy) {
    Asset asset = getAssetById(id);

    if (request.getName() != null && !request.getName().isBlank()) {
      asset.setName(request.getName().trim());
    }
    if (request.getCategory() != null) {
      asset.setCategory(request.getCategory());
    }
    if (request.getTypeId() != null) {
      asset.setType(equipmentTypeRepository.findById(request.getTypeId()).orElse(asset.getType()));
      if (request.getCategory() == null
          && asset.getType() != null
          && asset.getType().getCategory() != null) {
        asset.setCategory(asset.getType().getCategory());
      }
    }
    if (request.getManufacturerId() != null) {
      asset.setManufacturer(
          manufacturerRepository
              .findById(request.getManufacturerId())
              .orElse(asset.getManufacturer()));
    }
    if (request.getModelId() != null) {
      asset.setModel(
          machineModelRepository.findById(request.getModelId()).orElse(asset.getModel()));
    }
    if (request.getHubId() != null) {
      asset.setHub(hubRepository.findById(request.getHubId()).orElse(asset.getHub()));
    }
    if (request.getImageUrl() != null && !request.getImageUrl().isBlank()) {
      asset.setImageUrl(request.getImageUrl());
    }
    if (request.getSerialNumber() != null) {
      asset.setSerialNumber(request.getSerialNumber());
    }
    if (request.getDailyRate() != null) {
      asset.setDailyRate(request.getDailyRate());
    }
    if (request.getDepositAmount() != null) {
      asset.setDepositAmount(request.getDepositAmount());
    }
    if (request.getPurchaseCost() != null) {
      asset.setPurchaseCost(request.getPurchaseCost());
    }
    if (request.getOperatorRequired() != null) {
      asset.setOperatorRequired(request.getOperatorRequired());
    }
    if (request.getConditionNotes() != null) {
      asset.setConditionNotes(request.getConditionNotes());
    }
    if (request.getAccessoriesIncluded() != null) {
      asset.setAccessoriesIncluded(request.getAccessoriesIncluded());
    }
    if (request.getBillingUnitId() != null) {
      billingUnitMasterRepository
          .findById(request.getBillingUnitId())
          .ifPresent(
              bu -> {
                asset.setBillingUnitMaster(bu);
                asset.setBillingUnit(BillingUnit.fromValue(bu.getCode()));
                if (request.getShiftTerms() == null && bu.getDefaultShiftTerms() != null) {
                  asset.setShiftTerms(bu.getDefaultShiftTerms());
                }
              });
    } else if (request.getBillingUnit() != null) {
      asset.setBillingUnit(request.getBillingUnit());
    }
    if (request.getWorkingHoursLimit() != null) {
      asset.setWorkingHoursLimit(request.getWorkingHoursLimit());
    }
    if (request.getShiftTerms() != null) {
      asset.setShiftTerms(request.getShiftTerms());
    }

    Asset updated = assetRepository.save(asset);
    auditService.log(
        "ASSET",
        updated.getAssetTag(),
        "UPDATE",
        performedBy != null ? performedBy : "SYSTEM",
        "Updated asset: " + updated.getName() + ", billingUnit=" + updated.getBillingUnit());

    // Automatically refresh vector embedding asynchronously when asset attributes change
    try {
      CompletableFuture.runAsync(
          () -> {
            try {
              assetVectorEmbeddingService.updateAssetEmbedding(updated.getId());
            } catch (Exception ex) {
              log.warn(
                  "[AssetService] Automatic vector embedding refresh failed for asset ID={}: {}",
                  updated.getId(),
                  ex.getMessage());
            }
          });
    } catch (Exception e) {
      log.warn(
          "[AssetService] Could not schedule vector embedding refresh for asset ID={}: {}",
          updated.getId(),
          e.getMessage());
    }

    return updated;
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
    auditService.log(
        "ASSET",
        updated.getAssetTag(),
        "STATUS_CHANGE",
        performedBy != null ? performedBy : "SYSTEM",
        "Status transitioned from " + oldStatus + " to " + newStatus);
    return updated;
  }

  private void validateStateTransition(AssetStatus from, AssetStatus to) {
    if (from == to) return;

    if (from == AssetStatus.RETIRED) {
      throw new Exceptions.BusinessRuleViolationException(
          "Cannot change status of a retired asset");
    }

    if (from == AssetStatus.ON_RENT && to == AssetStatus.AVAILABLE) {
      throw new Exceptions.BusinessRuleViolationException(
          "On-rent asset must undergo return inspection before becoming available");
    }
  }

  @Override
  @Transactional
  public Asset uploadImage(Long id, MultipartFile file, String performedBy) {
    Asset asset = getAssetById(id);

    // 1. Upload to tmp bucket
    Map<String, Object> tmpResult = storageService.uploadFileTemporary(file);
    String tmpUrl = (String) tmpResult.get("url");

    // 2. Promote tmp → permanent via S3-to-S3 copy (no data through server)
    String permanentKey =
        storageService.copyToPermanentStorage(
            DocumentType.ASSET_IMAGE,
            tmpUrl,
            asset.getAssetTag().toLowerCase() + "_" + asset.getId());

    // 3. Build the public permanent URL and persist
    String permanentUrl = storageService.createPreSignedFileUrl(permanentKey);
    asset.setImageUrl(permanentUrl != null ? permanentUrl : tmpUrl);
    Asset saved = assetRepository.save(asset);

    auditService.log(
        "ASSET",
        asset.getAssetTag(),
        "IMAGE_UPLOAD",
        performedBy != null ? performedBy : "SYSTEM",
        "Image uploaded to S3: " + permanentKey);

    log.info("[Asset] Image updated for {} -> {}", asset.getAssetTag(), permanentKey);
    return saved;
  }

  @Override
  public List<WebsiteMachineModelResponse> getWebsiteCatalog(AssetCategory category, Long hubId) {
    List<Asset> all = assetQueryRepository.fetchAssets(category, null);
    all.forEach(
        a -> {
          populateMedia(a);
          populateRentalPricing(a);
        });

    // Group by distinct machine model name
    Map<String, List<Asset>> grouped =
        all.stream()
            .collect(
                java.util.stream.Collectors.groupingBy(
                    a -> a.getName() != null ? a.getName().trim() : a.getAssetTag(),
                    java.util.LinkedHashMap::new,
                    java.util.stream.Collectors.toList()));

    List<WebsiteMachineModelResponse> result = new java.util.ArrayList<>();

    for (Map.Entry<String, List<Asset>> entry : grouped.entrySet()) {
      List<Asset> units = entry.getValue();
      if (units.isEmpty()) continue;

      // If hubId is filtered, check if any unit belongs to this hub
      if (hubId != null) {
        boolean hasHub =
            units.stream().anyMatch(u -> u.getHub() != null && hubId.equals(u.getHub().getId()));
        if (!hasHub) continue;
      }

      Asset rep =
          units.stream()
              .filter(u -> u.getStatus() == AssetStatus.AVAILABLE)
              .findFirst()
              .orElse(units.get(0));

      int totalUnits = units.size();
      int availableUnits =
          (int) units.stream().filter(u -> u.getStatus() == AssetStatus.AVAILABLE).count();

      List<String> hubNames =
          units.stream()
              .map(Asset::getHub)
              .filter(java.util.Objects::nonNull)
              .map(com.equipgrid.location.entity.Hub::getName)
              .distinct()
              .toList();

      List<Long> hubIds =
          units.stream()
              .map(Asset::getHub)
              .filter(java.util.Objects::nonNull)
              .map(com.equipgrid.location.entity.Hub::getId)
              .distinct()
              .toList();

      String demoVideo = null;
      if (rep.getMediaItems() != null) {
        demoVideo =
            rep.getMediaItems().stream()
                .filter(m -> "VIDEO".equalsIgnoreCase(m.getMediaType()))
                .map(com.equipgrid.asset.entity.AssetMedia::getUrl)
                .findFirst()
                .orElse(null);
      }

      BillingUnit effectiveUnit = rep.getBillingUnit();
      String effectiveShift = rep.getShiftTerms();
      String effectiveHindiName = rep.getType() != null ? rep.getType().getHindiName() : null;
      String effectiveLocalLang =
          rep.getType() != null ? rep.getType().getLocalLanguageName() : null;
      String effectiveDesc = rep.getType() != null ? rep.getType().getDescription() : null;
      String effectiveHindiDesc =
          rep.getType() != null ? rep.getType().getHindiDescription() : null;

      Long bUnitId = null;
      String uLabel = null;
      String hUnitLabel = null;
      String uLabelLong = null;
      String bUnitCode = null;
      String bUnitName = null;
      String bUnitHindiName = null;

      if (rep.getBillingUnitMaster() != null) {
        bUnitId = rep.getBillingUnitMaster().getId();
        uLabel = rep.getBillingUnitMaster().getUnitLabel();
        hUnitLabel = rep.getBillingUnitMaster().getHindiUnitLabel();
        uLabelLong = rep.getBillingUnitMaster().getUnitLabelLong();
        bUnitCode = rep.getBillingUnitMaster().getCode();
        bUnitName = rep.getBillingUnitMaster().getName();
        bUnitHindiName = rep.getBillingUnitMaster().getHindiName();
      } else if (effectiveUnit != null) {
        bUnitId = effectiveUnit.getValue() != null ? effectiveUnit.getValue().longValue() : null;
        uLabel = effectiveUnit.getUnitLabel();
        hUnitLabel = null;
        uLabelLong = effectiveUnit.getUnitLabelLong();
        bUnitCode = effectiveUnit.getCode();
        bUnitName = effectiveUnit.getDisplayName();
      }

      result.add(
          WebsiteMachineModelResponse.builder()
              .id(rep.getId())
              .assetTag(rep.getAssetTag())
              .name(rep.getName())
              .hindiName(effectiveHindiName)
              .localLanguageName(effectiveLocalLang)
              .description(effectiveDesc)
              .hindiDescription(effectiveHindiDesc)
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
              .manufacturerName(
                  rep.getManufacturer() != null
                      ? rep.getManufacturer().getName()
                      : (rep.getModel() != null && rep.getModel().getManufacturer() != null
                          ? rep.getModel().getManufacturer().getName()
                          : null))
              .modelNumber(rep.getModel() != null ? rep.getModel().getModelNumber() : null)
              .typeName(rep.getType() != null ? rep.getType().getName() : null)
              .typeCode(rep.getType() != null ? rep.getType().getCode() : null)
              .accessoriesIncluded(rep.getAccessoriesIncluded())
              .conditionNotes(rep.getConditionNotes())
              .engineHours(rep.getEngineHours())
              .specs(rep.getModel() != null ? rep.getModel().getSpecs() : null)
              .serialNumber(rep.getSerialNumber())
              .billingUnit(effectiveUnit)
              .workingHoursLimit(rep.getWorkingHoursLimit())
              .shiftTerms(effectiveShift)
              .billingUnitId(bUnitId)
              .unitLabel(uLabel)
              .hindiUnitLabel(hUnitLabel)
              .unitLabelLong(uLabelLong)
              .billingUnitCode(bUnitCode)
              .billingUnitName(bUnitName)
              .billingUnitHindiName(bUnitHindiName)
              .build());
    }

    return result;
  }

  @Override
  @Transactional
  public void deleteAsset(Long id, com.equipgrid.auth.entity.User caller) {
    if (caller != null && caller.getRole() != null && caller.getRole() != Role.ROOT) {
      throw new Exceptions.BusinessRuleViolationException(
          "Forbidden: You are not allowed to perform this operation");
    }

    Asset asset =
        assetRepository
            .findById(id)
            .orElseThrow(
                () -> new Exceptions.ResourceNotFoundException("Asset not found with ID: " + id));
    assetRepository.delete(asset);
    log.info(
        "Asset {} (Tag: {}) deleted by actor: {}",
        id,
        asset.getAssetTag(),
        caller != null ? caller.getUsername() : "ROOT");
  }
}
