package com.equipgrid.property.service;

import com.equipgrid.common.exception.EquipGridException;
import com.equipgrid.common.exception.EquipGridExceptionEnum;
import com.equipgrid.common.storage.service.StorageService;
import com.equipgrid.property.dto.DynamicPropertyRequest;
import com.equipgrid.property.dto.DynamicPropertyResponse;
import com.equipgrid.property.entity.DynamicProperty;
import com.equipgrid.property.repository.DynamicPropertyRepository;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class DynamicPropertyService {

  private final DynamicPropertyRepository dynamicPropertyRepository;
  private final StorageService storageService;

  @Transactional(readOnly = true)
  public DynamicPropertyResponse getPropertyByKey(String key) {
    DynamicProperty property =
        dynamicPropertyRepository
            .findByKey(key)
            .orElseThrow(
                () ->
                    new EquipGridException(
                        EquipGridExceptionEnum.EG_404,
                        "Dynamic property not found for key: " + key));
    return toResponse(property);
  }

  @Transactional(readOnly = true)
  public Optional<DynamicPropertyResponse> findPropertyByKey(String key) {
    return dynamicPropertyRepository.findByKey(key).map(this::toResponse);
  }

  @Transactional(readOnly = true)
  public List<DynamicPropertyResponse> getAllProperties() {
    return dynamicPropertyRepository.findAll().stream().map(this::toResponse).toList();
  }

  @Transactional
  public DynamicPropertyResponse upsertProperty(DynamicPropertyRequest request) {
    DynamicProperty property =
        dynamicPropertyRepository
            .findByKey(request.getKey())
            .map(
                existing -> {
                  existing.setValue(request.getValue());
                  existing.setUrl(request.getUrl());
                  return existing;
                })
            .orElseGet(
                () ->
                    DynamicProperty.builder()
                        .key(request.getKey())
                        .value(request.getValue())
                        .url(request.getUrl())
                        .build());

    DynamicProperty saved = dynamicPropertyRepository.save(property);
    log.info("[DynamicProperty] Upserted key={}, url={}", saved.getKey(), saved.getUrl());
    return toResponse(saved);
  }

  public DynamicPropertyResponse toResponse(DynamicProperty entity) {
    String rawUrl = entity.getUrl();
    String resolvedUrl = resolveUrl(rawUrl);
    String bucket = null;
    String objectKey = null;

    if (rawUrl != null && rawUrl.startsWith("s3://")) {
      String path = rawUrl.substring("s3://".length());
      int firstSlash = path.indexOf('/');
      if (firstSlash != -1) {
        bucket = path.substring(0, firstSlash);
        objectKey = path.substring(firstSlash + 1);
      } else {
        bucket = path;
      }
    }

    return DynamicPropertyResponse.builder()
        .id(entity.getId())
        .key(entity.getKey())
        .value(entity.getValue())
        .rawUrl(rawUrl)
        .url(resolvedUrl)
        .bucket(bucket)
        .objectKey(objectKey)
        .createdAt(entity.getCreatedAt())
        .updatedAt(entity.getUpdatedAt())
        .build();
  }

  public String resolveUrl(String url) {
    if (url == null || url.isBlank()) {
      return null;
    }

    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) {
      return url;
    }

    if (url.startsWith("s3://")) {
      String path = url.substring("s3://".length());
      int firstSlash = path.indexOf('/');
      if (firstSlash != -1) {
        String bucket = path.substring(0, firstSlash);
        String key = path.substring(firstSlash + 1);
        return resolveS3HttpUrl(bucket, key);
      }
    }

    return url;
  }

  private String resolveS3HttpUrl(String bucket, String key) {
    try {
      String presigned = storageService.getPreSignedDownloadUrl(bucket, key, 1440); // 24 hours
      if (presigned != null && !presigned.isBlank()) {
        return presigned;
      }
    } catch (Exception e) {
      log.warn(
          "[DynamicProperty] Could not presign URL for bucket={}, key={}: {}. Falling back to public URL",
          bucket,
          key,
          e.getMessage());
    }

    return storageService.getPublicFileUrl(bucket, key);
  }
}
