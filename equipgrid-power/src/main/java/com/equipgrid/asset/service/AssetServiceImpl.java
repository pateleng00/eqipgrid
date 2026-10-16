package com.equipgrid.asset.service;

import com.equipgrid.asset.dto.request.CreateAssetRequest;
import com.equipgrid.asset.dto.response.WebsiteMachineModelResponse;
import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.entity.AssetMedia;
import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.asset.enums.AssetStatus;
import com.equipgrid.asset.enums.BillingUnit;
import com.equipgrid.asset.repository.AssetQueryRepository;
import com.equipgrid.asset.repository.AssetRepository;
import com.equipgrid.audit.service.IAuditService;
import com.equipgrid.auth.enums.Role;
import com.equipgrid.common.Exceptions;
import com.equipgrid.common.storage.enums.DocumentType;
import com.equipgrid.common.storage.service.StorageService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
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
  private final com.equipgrid.asset.repository.AssetMediaRepository assetMediaRepository;
  private final IAuditService auditService;
  private final StorageService storageService;
  private final com.equipgrid.master.repository.EquipmentTypeRepository equipmentTypeRepository;
  private final com.equipgrid.master.repository.ManufacturerRepository manufacturerRepository;
  private final com.equipgrid.master.repository.MachineModelRepository machineModelRepository;
  private final com.equipgrid.location.repository.HubRepository hubRepository;
  private final com.equipgrid.master.repository.BillingUnitMasterRepository
      billingUnitMasterRepository;
  private final com.equipgrid.rentalconfig.repository.RentalConfigurationRepository
      rentalConfigurationRepository;

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
    var configs =
        rentalConfigurationRepository.findByAssetIdAndHubIdAndActiveTrue(asset.getId(), hId);
    if (!configs.isEmpty()) {
      var cfg = configs.get(0);
      asset.setDailyRate(cfg.getBaseDailyRate());
      asset.setDepositAmount(cfg.getDepositAmount());
      if (cfg.getBillingUnit() != null) asset.setBillingUnit(cfg.getBillingUnit());
      if (cfg.getBillingUnitMaster() != null) asset.setBillingUnitMaster(cfg.getBillingUnitMaster());
      if (cfg.getShiftTerms() != null && !cfg.getShiftTerms().isBlank()) {
        asset.setShiftTerms(cfg.getShiftTerms());
      }
      if (cfg.getWorkingHoursLimit() != null) {
        asset.setWorkingHoursLimit(cfg.getWorkingHoursLimit());
      }
    } else if (asset.getType() != null && asset.getHub() != null) {
      configs =
          rentalConfigurationRepository.findByTypeIdAndHubIdAndActiveTrue(
              asset.getType().getId(), asset.getHub().getId());
      if (!configs.isEmpty()) {
        var cfg = configs.get(0);
        asset.setDailyRate(cfg.getBaseDailyRate());
        asset.setDepositAmount(cfg.getDepositAmount());
        if (cfg.getBillingUnit() != null) asset.setBillingUnit(cfg.getBillingUnit());
        if (cfg.getBillingUnitMaster() != null) asset.setBillingUnitMaster(cfg.getBillingUnitMaster());
        if (cfg.getShiftTerms() != null && !cfg.getShiftTerms().isBlank()) {
          asset.setShiftTerms(cfg.getShiftTerms());
        }
        if (cfg.getWorkingHoursLimit() != null) {
          asset.setWorkingHoursLimit(cfg.getWorkingHoursLimit());
        }
      } else {
        asset.setDailyRate(null);
        asset.setDepositAmount(null);
      }
    } else {
      asset.setDailyRate(null);
      asset.setDepositAmount(null);
    }
  }

  private void populateMedia(Asset asset) {
    if (asset == null || asset.getId() == null) return;
    var mediaList =
        assetMediaRepository.findByAssetIdOrderByMediaTypeAscDisplayOrderAsc(asset.getId());
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
                : "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800");

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
      if (effectiveUnit == null) {
        effectiveUnit = resolveDefaultBillingUnit(rep.getName(), rep.getAssetTag());
      }

      String effectiveShift = rep.getShiftTerms();
      if (effectiveShift == null || effectiveShift.isBlank()) {
        effectiveShift =
            resolveDefaultShiftTerms(
                rep.getName(), rep.getAssetTag(), effectiveUnit, rep.getDepositAmount());
      }

      String effectiveHindiName =
          rep.getType() != null
                  && rep.getType().getHindiName() != null
                  && !rep.getType().getHindiName().isBlank()
              ? rep.getType().getHindiName()
              : getHindiName(rep.getName());
      String effectiveLocalLang =
          rep.getType() != null ? rep.getType().getLocalLanguageName() : null;
      String effectiveDesc = rep.getType() != null ? rep.getType().getDescription() : null;
      String effectiveHindiDesc =
          rep.getType() != null ? rep.getType().getHindiDescription() : null;

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
              .billingUnitId(
                  rep.getBillingUnitMaster() != null
                      ? rep.getBillingUnitMaster().getId()
                      : (effectiveUnit != null ? effectiveUnit.getValue().longValue() : 1L))
              .unitLabel(
                  rep.getBillingUnitMaster() != null
                      ? rep.getBillingUnitMaster().getUnitLabel()
                      : (effectiveUnit != null ? effectiveUnit.getUnitLabel() : "day"))
              .hindiUnitLabel(
                  rep.getBillingUnitMaster() != null
                      ? rep.getBillingUnitMaster().getHindiUnitLabel()
                      : "दिन")
              .unitLabelLong(
                  rep.getBillingUnitMaster() != null
                      ? rep.getBillingUnitMaster().getUnitLabelLong()
                      : (effectiveUnit != null ? effectiveUnit.getUnitLabelLong() : "24-hr day"))
              .billingUnitCode(
                  rep.getBillingUnitMaster() != null
                      ? rep.getBillingUnitMaster().getCode()
                      : (effectiveUnit != null ? effectiveUnit.getCode() : "DAILY"))
              .billingUnitName(
                  rep.getBillingUnitMaster() != null
                      ? rep.getBillingUnitMaster().getName()
                      : (effectiveUnit != null ? effectiveUnit.getDisplayName() : "Per Day"))
              .billingUnitHindiName(
                  rep.getBillingUnitMaster() != null
                      ? rep.getBillingUnitMaster().getHindiName()
                      : "प्रति दिन")
              .build());
    }

    return result;
  }

  private BillingUnit resolveDefaultBillingUnit(String name, String tag) {
    String upper = ((name != null ? name : "") + " " + (tag != null ? tag : "")).toUpperCase();
    if (upper.contains("AUGER")
        || upper.contains("HOLE")
        || upper.contains("DIGGER")
        || upper.contains("AUG")) {
      return BillingUnit.PER_HOLE;
    }
    if (upper.contains("PUMP")
        || upper.contains("TRASH")
        || upper.contains("DEWATER")
        || upper.contains("PMP")) {
      return BillingUnit.HOURLY;
    }
    if (upper.contains("TROLLEY") || upper.contains("TRIP")) {
      return BillingUnit.PER_TRIP;
    }
    if (upper.contains("ACRE") || upper.contains("SPRAYER")) {
      return BillingUnit.PER_ACRE;
    }
    return BillingUnit.DAILY;
  }

  private String resolveDefaultShiftTerms(
      String name, String tag, BillingUnit billingUnit, BigDecimal deposit) {
    if (billingUnit == BillingUnit.PER_HOLE) {
      return "Per hole drilled • Includes 6\" & 8\" bits • Zero time boundation";
    }
    if (billingUnit == BillingUnit.HOURLY) {
      return "Hourly metered operation • Pay for actual run time";
    }
    if (billingUnit == BillingUnit.PER_TRIP) {
      return "Per transport trip • No daily shift restriction";
    }
    if (billingUnit == BillingUnit.PER_ACRE) {
      return "Per acre worked • Rate based on land area covered";
    }
    if (deposit != null && deposit.compareTo(BigDecimal.ZERO) == 0) {
      return "Full 24-hr day site deployment • Zero security deposit required";
    }
    return "Full 24-hr day site deployment • Flexible field usage";
  }

  private String getHindiName(String name) {
    if (name == null) return "";
    String upper = name.toUpperCase();
    if (upper.contains("MIX")) return "कंक्रीट मिलाने की मशीन (Concrete Mixer)";
    if (upper.contains("VIBRAT")) return "कंक्रीट बैठाने/कंपन की मशीन (Concrete Vibrator)";
    if (upper.contains("COMPACT") || upper.contains("RAMMER"))
      return "मिट्टी व रोड़ी कुटाई/दबाने की मशीन (Plate Compactor)";
    if (upper.contains("JACKHAMMER") || upper.contains("BREAKER"))
      return "कंक्रीट व पत्थर तोड़ने की मशीन (Demolition Jackhammer)";
    if (upper.contains("PUMP") || upper.contains("TRASH"))
      return "पानी व कीचड़ निकालने का पम्प (Dewatering Trash Pump)";
    if (upper.contains("GEN") || upper.contains("POWER"))
      return "बिजली जनरेटर (Portable Power Generator)";
    if (upper.contains("WEED") || upper.contains("ROTARY"))
      return "खेत की जुताई व निराई-गुड़ाई की मशीन (Power Weeder)";
    if (upper.contains("REAP") || upper.contains("HARVEST"))
      return "फसल/धान व गेहूँ काटने की मशीन (Crop Power Reaper)";
    if (upper.contains("AUGER") || upper.contains("HOLE"))
      return "जमीन में गड्ढा खोदने की मशीन (Post-Hole Earth Auger)";
    if (upper.contains("TROLLEY") || upper.contains("TIPPER") || upper.contains("TRL"))
      return "हाइड्रोलिक ट्रैक्टर ट्रॉली (Tractor Tipper Trailer)";
    if (upper.contains("TANKER") || upper.contains("SPRAYER") || upper.contains("TNK"))
      return "वाटर टैंकर व स्प्रेयर (Mobile Water Tanker)";
    return name;
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
