package com.equipgrid.maintenance.service;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.enums.AssetStatus;
import com.equipgrid.asset.repository.AssetRepository;
import com.equipgrid.common.exception.EquipGridException;
import com.equipgrid.common.exception.EquipGridExceptionEnum;
import com.equipgrid.common.storage.enums.DocumentType;
import com.equipgrid.common.storage.service.StorageService;
import com.equipgrid.location.entity.Hub;
import com.equipgrid.location.repository.HubRepository;
import com.equipgrid.maintenance.dto.CompleteMaintenanceRequest;
import com.equipgrid.maintenance.dto.CreateMaintenanceRequest;
import com.equipgrid.maintenance.dto.MaintenanceRecordResponse;
import com.equipgrid.maintenance.dto.UpdateMaintenanceProgressRequest;
import com.equipgrid.maintenance.entity.MaintenanceDamageComponent;
import com.equipgrid.maintenance.entity.MaintenanceRecord;
import com.equipgrid.maintenance.enums.MaintenancePriority;
import com.equipgrid.maintenance.enums.MaintenanceServiceType;
import com.equipgrid.maintenance.enums.MaintenanceStatus;
import com.equipgrid.maintenance.repository.MaintenanceDamageComponentRepository;
import com.equipgrid.maintenance.repository.MaintenanceRecordRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class MaintenanceServiceImpl implements IMaintenanceService {

  private final MaintenanceRecordRepository maintenanceRecordRepository;
  private final MaintenanceDamageComponentRepository damageComponentRepository;
  private final AssetRepository assetRepository;
  private final HubRepository hubRepository;
  private final StorageService storageService;
  private final org.springframework.beans.factory.ObjectProvider<CacheManager> cacheManagerProvider;

  private static final com.fasterxml.jackson.databind.ObjectMapper JSON_MAPPER =
      new com.fasterxml.jackson.databind.ObjectMapper();

  @Override
  @Transactional
  public MaintenanceRecordResponse createMaintenanceRecord(
      CreateMaintenanceRequest request, Long userId) {
    Asset asset =
        assetRepository
            .findById(request.getAssetId())
            .orElseThrow(
                () ->
                    new EquipGridException(
                        EquipGridExceptionEnum.EG_RECORD_NOT_FOUND,
                        "Asset not found with ID: " + request.getAssetId()));

    // Prevent moving machines into maintenance if currently dispatched or on rent
    if (asset.getStatus() == AssetStatus.ON_RENT || asset.getStatus() == AssetStatus.DISPATCHED) {
      throw new EquipGridException(
          EquipGridExceptionEnum.EG_BUSINESS_RULE_VIOLATION,
          "Machine is currently ON_RENT or DISPATCHED to a farmer and cannot enter maintenance.");
    }

    Hub hub = asset.getHub();
    if (hub == null) {
      throw new EquipGridException(
          EquipGridExceptionEnum.EG_BUSINESS_RULE_VIOLATION,
          "Asset must be assigned to an active hub before entering maintenance.");
    }

    // Validation for REPAIR_WORK or SERVICE_AND_REPAIR with 'OTHER' damage component
    if (request.getServiceType() == MaintenanceServiceType.REPAIR_WORK
        || request.getServiceType() == MaintenanceServiceType.SERVICE_AND_REPAIR) {
      if (request.getDamagedComponents() != null) {
        boolean hasOther =
            request.getDamagedComponents().stream()
                .anyMatch(c -> c.equalsIgnoreCase("OTHER") || c.contains("OTHER"));
        if (hasOther
            && (request.getOtherDamageDescription() == null
                || request.getOtherDamageDescription().isBlank())) {
          throw new EquipGridException(
              EquipGridExceptionEnum.EG_400,
              "Please provide an explanation/description for the 'Other' damaged component.");
        }
      }
    }

    String ticketNumber = generateUniqueTicketNumber();

    // Lock asset status out of website bookings and station availability
    AssetStatus targetStatus =
        request.getServiceType() == MaintenanceServiceType.REPAIR_WORK
            ? AssetStatus.DAMAGED
            : AssetStatus.MAINTENANCE;

    asset.setStatus(targetStatus);
    asset.setConditionNotes(
        String.format(
            "Under %s (%s). Issue: %s [Ticket: %s]",
            request.getServiceType(),
            request.getLocationType(),
            request.getIssueDescription(),
            ticketNumber));

    if (request.getMeterHoursAtService() != null && request.getMeterHoursAtService() > 0) {
      asset.setEngineHours(BigDecimal.valueOf(request.getMeterHoursAtService()));
    }
    assetRepository.save(asset);

    MaintenanceRecord record =
        MaintenanceRecord.builder()
            .ticketNumber(ticketNumber)
            .asset(asset)
            .hub(hub)
            .serviceType(request.getServiceType())
            .locationType(request.getLocationType())
            .serviceCenterName(request.getServiceCenterName())
            .serviceCenterContact(request.getServiceCenterContact())
            .serviceCenterAddress(request.getServiceCenterAddress())
            .priority(
                request.getPriority() != null ? request.getPriority() : MaintenancePriority.NORMAL)
            .status(MaintenanceStatus.IN_PROGRESS)
            .issueDescription(request.getIssueDescription())
            .workScope(request.getWorkScope())
            .serviceNumber(request.getServiceNumber())
            .isFreeService(Boolean.TRUE.equals(request.getIsFreeService()))
            .periodicServiceNotes(request.getPeriodicServiceNotes())
            .damagedComponents(toJson(request.getDamagedComponents()))
            .otherDamageDescription(request.getOtherDamageDescription())
            .damageImageUrls(toJson(request.getDamageImageUrls()))
            .estimatedCost(request.getEstimatedCost())
            .expectedCompletionDate(request.getExpectedCompletionDate())
            .meterHoursAtService(request.getMeterHoursAtService())
            .assignedTechnician(request.getAssignedTechnician())
            .startedAt(OffsetDateTime.now())
            .build();

    if (userId != null) {
      record.setCreatedBy(userId);
      record.setUpdatedBy(userId);
    }

    MaintenanceRecord saved = maintenanceRecordRepository.save(record);
    evictCaches();
    log.info(
        "[Maintenance] Created ticket {} for asset {} ({}) at hub {}",
        ticketNumber,
        asset.getId(),
        asset.getName(),
        hub.getName());

    return MaintenanceRecordResponse.fromEntity(saved);
  }

  @Override
  @Transactional
  public MaintenanceRecordResponse updateMaintenanceProgress(
      Long ticketId, UpdateMaintenanceProgressRequest request, Long userId) {
    MaintenanceRecord record =
        maintenanceRecordRepository
            .findById(ticketId)
            .orElseThrow(
                () ->
                    new EquipGridException(
                        EquipGridExceptionEnum.EG_RECORD_NOT_FOUND,
                        "Maintenance ticket not found: " + ticketId));

    if (record.getStatus() == MaintenanceStatus.COMPLETED
        || record.getStatus() == MaintenanceStatus.CANCELLED) {
      throw new EquipGridException(
          EquipGridExceptionEnum.EG_BUSINESS_RULE_VIOLATION,
          "Cannot update progress on an already completed or cancelled ticket.");
    }

    if (request.getStatus() != null) {
      record.setStatus(request.getStatus());
    }
    if (request.getPriority() != null) {
      record.setPriority(request.getPriority());
    }
    if (request.getWorkScope() != null) {
      record.setWorkScope(request.getWorkScope());
    }
    if (request.getEstimatedCost() != null) {
      record.setEstimatedCost(request.getEstimatedCost());
    }
    if (request.getExpectedCompletionDate() != null) {
      record.setExpectedCompletionDate(request.getExpectedCompletionDate());
    }
    if (request.getCompletionNotes() != null) {
      record.setCompletionNotes(request.getCompletionNotes());
    }
    if (request.getAssignedTechnician() != null) {
      record.setAssignedTechnician(request.getAssignedTechnician());
    }
    if (userId != null) {
      record.setUpdatedBy(userId);
    }

    MaintenanceRecord updated = maintenanceRecordRepository.save(record);
    return MaintenanceRecordResponse.fromEntity(updated);
  }

  @Override
  @Transactional
  public MaintenanceRecordResponse completeMaintenanceRecord(
      Long ticketId, CompleteMaintenanceRequest request, Long userId) {
    MaintenanceRecord record =
        maintenanceRecordRepository
            .findById(ticketId)
            .orElseThrow(
                () ->
                    new EquipGridException(
                        EquipGridExceptionEnum.EG_RECORD_NOT_FOUND,
                        "Maintenance ticket not found: " + ticketId));

    if (record.getStatus() == MaintenanceStatus.COMPLETED) {
      throw new EquipGridException(
          EquipGridExceptionEnum.EG_BUSINESS_RULE_VIOLATION,
          "Ticket " + record.getTicketNumber() + " is already completed.");
    }

    BigDecimal partsCost =
        request.getActualPartsCost() != null ? request.getActualPartsCost() : BigDecimal.ZERO;
    BigDecimal laborCost =
        request.getActualLaborCost() != null ? request.getActualLaborCost() : BigDecimal.ZERO;
    BigDecimal total =
        request.getTotalCost() != null ? request.getTotalCost() : partsCost.add(laborCost);

    record.setActualPartsCost(partsCost);
    record.setActualLaborCost(laborCost);
    record.setTotalCost(total);

    if (request.getInvoiceNumber() != null && !request.getInvoiceNumber().isBlank()) {
      record.setInvoiceNumber(request.getInvoiceNumber());
    }
    if (request.getInvoiceDocumentUrl() != null && !request.getInvoiceDocumentUrl().isBlank()) {
      record.setInvoiceDocumentUrl(request.getInvoiceDocumentUrl());
    }
    if (request.getInvoiceFileName() != null && !request.getInvoiceFileName().isBlank()) {
      record.setInvoiceFileName(request.getInvoiceFileName());
    }
    if (request.getInvoiceFileType() != null && !request.getInvoiceFileType().isBlank()) {
      record.setInvoiceFileType(request.getInvoiceFileType());
    }
    if (record.getInvoiceDocumentUrl() != null && record.getInvoiceUploadedAt() == null) {
      record.setInvoiceUploadedAt(OffsetDateTime.now());
    }

    if (request.getCompletionNotes() != null) {
      record.setCompletionNotes(request.getCompletionNotes());
    }
    if (request.getNextServiceDueHours() != null) {
      record.setNextServiceDueHours(request.getNextServiceDueHours());
    }

    record.setStatus(MaintenanceStatus.COMPLETED);
    record.setCompletedAt(OffsetDateTime.now());
    if (userId != null) {
      record.setUpdatedBy(userId);
    }

    // Restore asset availability for booking on website and station desk
    Asset asset = record.getAsset();
    asset.setStatus(AssetStatus.AVAILABLE);
    asset.setConditionNotes(
        String.format(
            "Ready for rental. Service completed on %s (Ticket: %s).",
            LocalDate.now(), record.getTicketNumber()));

    if (request.getMeterHoursAfterService() != null && request.getMeterHoursAfterService() > 0) {
      asset.setEngineHours(BigDecimal.valueOf(request.getMeterHoursAfterService()));
    }
    assetRepository.save(asset);

    MaintenanceRecord saved = maintenanceRecordRepository.save(record);
    evictCaches();
    log.info(
        "[Maintenance] Ticket {} completed. Machine {} restored to AVAILABLE.",
        record.getTicketNumber(),
        asset.getId());

    return MaintenanceRecordResponse.fromEntity(saved);
  }

  @Override
  @Transactional
  public MaintenanceRecordResponse uploadMaintenanceInvoice(
      Long ticketId, MultipartFile file, Long userId) {
    MaintenanceRecord record =
        maintenanceRecordRepository
            .findById(ticketId)
            .orElseThrow(
                () ->
                    new EquipGridException(
                        EquipGridExceptionEnum.EG_RECORD_NOT_FOUND,
                        "Maintenance ticket not found: " + ticketId));

    if (file == null || file.isEmpty()) {
      throw new EquipGridException(
          EquipGridExceptionEnum.EG_400, "Invoice document file is missing or empty.");
    }

    // Upload to temp bucket first
    Map<String, Object> tempResult = storageService.uploadFileTemporary(file);
    String tempUrl = (String) tempResult.get("url");

    // Promote to permanent S3 storage under assets/invoices
    String identifier = "inv_" + record.getTicketNumber() + "_" + System.currentTimeMillis();
    StorageService.StoragePromotionResult promoResult =
        storageService.promoteToPermanentStorage(
            DocumentType.MAINTENANCE_INVOICE, tempUrl, identifier);

    String finalUrl =
        (promoResult.url() != null && !promoResult.url().isBlank()) ? promoResult.url() : tempUrl;

    record.setInvoiceDocumentUrl(finalUrl);
    record.setInvoiceFileName(file.getOriginalFilename());
    record.setInvoiceFileType(file.getContentType());
    record.setInvoiceUploadedAt(OffsetDateTime.now());
    if (userId != null) {
      record.setUpdatedBy(userId);
    }

    MaintenanceRecord saved = maintenanceRecordRepository.save(record);
    log.info(
        "[Maintenance] Invoice uploaded for ticket {}: file={}, url={}",
        record.getTicketNumber(),
        file.getOriginalFilename(),
        finalUrl);

    return MaintenanceRecordResponse.fromEntity(saved);
  }

  @Override
  @Transactional(readOnly = true)
  public List<MaintenanceRecordResponse> getMaintenanceRecords(
      Long hubId, MaintenanceStatus status, Boolean activeOnly) {
    List<MaintenanceRecord> records;

    if (hubId != null) {
      if (Boolean.TRUE.equals(activeOnly)) {
        records =
            maintenanceRecordRepository.findByHubIdAndStatusNotOrderByCreatedAtDesc(
                hubId, MaintenanceStatus.COMPLETED);
      } else if (status != null) {
        records =
            maintenanceRecordRepository.findByHubIdOrderByCreatedAtDesc(hubId).stream()
                .filter(r -> r.getStatus() == status)
                .toList();
      } else {
        records = maintenanceRecordRepository.findByHubIdOrderByCreatedAtDesc(hubId);
      }
    } else {
      if (Boolean.TRUE.equals(activeOnly)) {
        records =
            maintenanceRecordRepository.findByStatusNotOrderByCreatedAtDesc(
                MaintenanceStatus.COMPLETED);
      } else if (status != null) {
        records = maintenanceRecordRepository.findByStatusOrderByCreatedAtDesc(status);
      } else {
        records = maintenanceRecordRepository.findAll();
      }
    }

    return records.stream().map(MaintenanceRecordResponse::fromEntity).toList();
  }

  @Override
  @Transactional(readOnly = true)
  public MaintenanceRecordResponse getMaintenanceRecordById(Long ticketId) {
    MaintenanceRecord record =
        maintenanceRecordRepository
            .findById(ticketId)
            .orElseThrow(
                () ->
                    new EquipGridException(
                        EquipGridExceptionEnum.EG_RECORD_NOT_FOUND,
                        "Maintenance ticket not found: " + ticketId));
    return MaintenanceRecordResponse.fromEntity(record);
  }

  @Override
  @Transactional(readOnly = true)
  public List<MaintenanceRecordResponse> getAssetMaintenanceHistory(Long assetId) {
    return maintenanceRecordRepository.findByAssetIdOrderByCreatedAtDesc(assetId).stream()
        .map(MaintenanceRecordResponse::fromEntity)
        .toList();
  }

  @Override
  @Transactional(readOnly = true)
  public List<MaintenanceDamageComponent> getActiveDamageComponents() {
    return damageComponentRepository.findByActiveTrueOrderByDisplayOrderAsc();
  }

  @Override
  public String uploadDamagePhoto(MultipartFile file, Long userId) {
    if (file == null || file.isEmpty()) {
      throw new EquipGridException(
          EquipGridExceptionEnum.EG_400, "Damage image file is missing or empty.");
    }

    Map<String, Object> tempResult = storageService.uploadFileTemporary(file);
    String tempUrl = (String) tempResult.get("url");

    String identifier =
        "damage_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8);
    StorageService.StoragePromotionResult promoResult =
        storageService.promoteToPermanentStorage(
            DocumentType.MAINTENANCE_IMAGE, tempUrl, identifier);

    String finalUrl =
        (promoResult.url() != null && !promoResult.url().isBlank()) ? promoResult.url() : tempUrl;

    log.info(
        "[Maintenance] Damage photo uploaded by user {}: file={}, url={}",
        userId,
        file.getOriginalFilename(),
        finalUrl);
    return finalUrl;
  }

  private String toJson(Object obj) {
    if (obj == null) {
      return null;
    }
    try {
      return JSON_MAPPER.writeValueAsString(obj);
    } catch (Exception e) {
      log.error("[Maintenance] Error converting object to JSON string", e);
      return null;
    }
  }

  private String generateUniqueTicketNumber() {
    int year = LocalDate.now().getYear();
    long count = maintenanceRecordRepository.count();
    String baseTicket = String.format("MNT-%d-%04d", year, count + 1);

    if (maintenanceRecordRepository.findByTicketNumber(baseTicket).isEmpty()) {
      return baseTicket;
    }
    // Fallback if sequence collides
    return String.format("MNT-%d-%04d-%03d", year, count + 1, (int) (Math.random() * 900) + 100);
  }

  private void evictCaches() {
    try {
      CacheManager cacheManager = cacheManagerProvider.getIfAvailable();
      if (cacheManager != null) {
        for (String cacheName : cacheManager.getCacheNames()) {
          org.springframework.cache.Cache cache = cacheManager.getCache(cacheName);
          if (cache != null) {
            cache.clear();
          }
        }
        log.info("[Maintenance] Successfully cleared all fleet and catalog caches");
      }
    } catch (Exception e) {
      log.warn("[Maintenance] Could not evict caches automatically", e);
    }
  }
}
