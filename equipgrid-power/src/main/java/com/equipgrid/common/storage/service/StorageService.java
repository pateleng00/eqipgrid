package com.equipgrid.common.storage.service;

import com.amazonaws.HttpMethod;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.*;
import com.equipgrid.common.config.properties.AwsProperties;
import com.equipgrid.common.exception.EquipGridException;
import com.equipgrid.common.exception.EquipGridExceptionEnum;
import com.equipgrid.common.storage.dto.request.DownloadRequest;
import com.equipgrid.common.storage.dto.request.PresignedUploadRequest;
import com.equipgrid.common.storage.dto.response.PresignedUploadResponse;
import com.equipgrid.common.storage.enums.DocumentType;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Date;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.time.DateUtils;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Component
@AllArgsConstructor
public class StorageService {

  private static final long MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024L; // 15 MB
  private static final long MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024L; // 100 MB
  private static final long MAX_DOCUMENT_SIZE_BYTES = 25 * 1024 * 1024L; // 25 MB

  private static final Set<String> ALLOWED_IMAGE_TYPES =
      Set.of("image/jpeg", "image/png", "image/webp", "image/gif");
  private static final Set<String> ALLOWED_VIDEO_TYPES =
      Set.of("video/mp4", "video/webm", "video/quicktime");
  private static final Set<String> ALLOWED_DOCUMENT_TYPES = Set.of("application/pdf");

  private final AmazonS3 s3client;
  private final AwsProperties awsProperties;
  private final Environment environment;

  public record StoragePromotionResult(String key, String url) {}

  public Map<String, Object> uploadFileTemporary(MultipartFile file) {
    String mediaType = validateMediaFile(file);

    String originalFilename = file.getOriginalFilename();
    String sanitizedFilename =
        originalFilename == null ? "file" : originalFilename.replaceAll("\\s+", "_");
    String key = appName() + "/" + UUID.randomUUID() + "_" + sanitizedFilename;

    try {
      uploadFileWithKey(awsProperties.getTmpBucketName(), file, key);

      // Generate presigned GET URL so private staging bucket files can be previewed/downloaded
      Date expiration = DateUtils.addMinutes(new Date(), awsProperties.getSignedUrlExpiryMinutes());
      String presignedUrl =
          s3client
              .generatePresignedUrl(
                  new GeneratePresignedUrlRequest(awsProperties.getTmpBucketName(), key)
                      .withMethod(HttpMethod.GET)
                      .withExpiration(expiration))
              .toString();

      log.info("[Storage] Temporary upload ({}): key={}", mediaType, key);
      return Map.of(
          "url", presignedUrl,
          "key", key,
          "fileName", sanitizedFilename,
          "mediaType", mediaType,
          "fileSizeBytes", file.getSize());
    } catch (IOException e) {
      log.error("[Storage] Error uploading temporary file", e);
      throw new EquipGridException(EquipGridExceptionEnum.EG_500);
    }
  }

  public Map<String, String> getPreSignedDownloadUrlFromCommonBucket(DownloadRequest request) {
    String url =
        getPreSignedDownloadUrl(
            awsProperties.getCommonBucketName(),
            request.getKey(),
            awsProperties.getSignedUrlExpiryMinutes());
    return Map.of("url", url);
  }

  public String getPreSignedDownloadUrl(
      String bucketName, String fileName, Integer expirationTimeMinutes) {
    if (awsProperties.getAccessKey() == null || awsProperties.getAccessKey().isBlank()) {
      return getPublicFileUrl(bucketName, fileName);
    }
    if (expirationTimeMinutes == null || expirationTimeMinutes <= 0) {
      throw new IllegalArgumentException("Expiration time must be a positive value.");
    }
    try {
      Date expiration = DateUtils.addMinutes(new Date(), expirationTimeMinutes);
      GeneratePresignedUrlRequest presignedUrlRequest =
          new GeneratePresignedUrlRequest(bucketName, fileName)
              .withMethod(HttpMethod.GET)
              .withExpiration(expiration);
      URL url = s3client.generatePresignedUrl(presignedUrlRequest);
      log.info("[Storage] Presigned GET URL generated for key={}", fileName);
      return url.toString();
    } catch (Exception e) {
      log.warn(
          "[Storage] Failed to generate presigned GET URL for key={}: {}. Falling back to public URL",
          fileName,
          e.getMessage());
      return getPublicFileUrl(bucketName, fileName);
    }
  }

  public PresignedUploadResponse generatePresignedUploadUrl(PresignedUploadRequest request) {
    String sanitizedFilename = request.getFileName().replaceAll("\\s+", "_");
    String key = appName() + "/" + UUID.randomUUID() + "_" + sanitizedFilename;
    String tempUrl = buildTmpUrl(key);

    Date expiration = DateUtils.addMinutes(new Date(), awsProperties.getSignedUrlExpiryMinutes());
    GeneratePresignedUrlRequest presignedUrlRequest =
        new GeneratePresignedUrlRequest(awsProperties.getTmpBucketName(), key)
            .withMethod(HttpMethod.PUT)
            .withExpiration(expiration)
            .withContentType(request.getContentType());

    String uploadUrl = s3client.generatePresignedUrl(presignedUrlRequest).toString();

    log.info("[Storage] Presigned PUT URL generated for key={}", key);
    return PresignedUploadResponse.builder()
        .uploadUrl(uploadUrl)
        .tempKey(key)
        .tempUrl(tempUrl)
        .build();
  }

  public String buildPermanentObjectKey(
      String category, String subFolder, String identifier, String ext) {
    String cleanCategory =
        (category != null && !category.isBlank())
            ? category.trim().toLowerCase().replaceAll("[^a-z0-9_-]", "")
            : "misc";
    String cleanSub =
        (subFolder != null && !subFolder.isBlank())
            ? subFolder.trim().toLowerCase().replaceAll("[^a-z0-9_-]", "")
            : "";
    String extension =
        (ext != null && !ext.isBlank()) ? (ext.startsWith(".") ? ext.substring(1) : ext) : "jpg";

    if (!cleanSub.isEmpty()) {
      return cleanCategory + "/" + cleanSub + "/" + identifier + "." + extension;
    }
    return cleanCategory + "/" + identifier + "." + extension;
  }

  public String buildPermanentObjectKey(DocumentType documentType, String identifier, String ext) {
    String category = documentType.getDocumentCategory().getFileStorageName();
    String subFolder = documentType.getFileStorageName();
    return buildPermanentObjectKey(category, subFolder, identifier, ext);
  }

  public String copyToPermanentStorage(
      DocumentType documentType, String fileUrl, String identifier) {
    return copyToPermanentCategoryFolder(
        documentType.getDocumentCategory().getFileStorageName(),
        documentType.getFileStorageName(),
        fileUrl,
        identifier);
  }

  public String copyToPermanentCategoryFolder(
      String category, String subFolder, String fileUrl, String identifier) {
    if (fileUrl == null || fileUrl.isBlank()) {
      return null;
    }

    try {
      String key;
      String host = "";
      if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
        URL parsedUrl = new URL(fileUrl);
        host = parsedUrl.getHost().split("\\.")[0];
        String rawKey =
            parsedUrl.getPath().startsWith("/")
                ? parsedUrl.getPath().substring(1)
                : parsedUrl.getPath();
        key = java.net.URLDecoder.decode(rawKey, java.nio.charset.StandardCharsets.UTF_8);
      } else {
        key = fileUrl.startsWith("/") ? fileUrl.substring(1) : fileUrl;
      }
      String ext = key.contains(".") ? key.substring(key.lastIndexOf('.') + 1) : "jpg";

      // Already in permanent storage or external URL — nothing to copy
      if (!host.contains(awsProperties.getTmpBucketName())
          && !key.contains(awsProperties.getTmpBucketName())) {
        log.info("[Storage] File already outside tmp bucket, preserving: {}", fileUrl);
        return fileUrl;
      }

      String objectKey = buildPermanentObjectKey(category, subFolder, identifier, ext);

      CopyObjectRequest copyRequest =
          new CopyObjectRequest(
              awsProperties.getTmpBucketName(), key,
              awsProperties.getCommonBucketName(), objectKey);
      s3client.copyObject(copyRequest);

      log.info(
          "[Storage] File copied to permanent category folder: bucket={} key={}",
          awsProperties.getCommonBucketName(),
          objectKey);
      return objectKey;

    } catch (Exception e) {
      log.error("[Storage] Error copying file to permanent storage: {}", fileUrl, e);
      return fileUrl;
    }
  }

  public StoragePromotionResult promoteToPermanentStorage(
      DocumentType documentType, String fileUrl, String identifier) {
    if (fileUrl == null || fileUrl.isBlank()) {
      return new StoragePromotionResult(null, null);
    }
    String s3Key = copyToPermanentStorage(documentType, fileUrl, identifier);
    String permUrl;
    if (s3Key != null && (s3Key.startsWith("http://") || s3Key.startsWith("https://"))) {
      permUrl = s3Key;
    } else {
      permUrl = getPublicFileUrl(awsProperties.getCommonBucketName(), s3Key);
    }
    return new StoragePromotionResult(s3Key, permUrl);
  }

  public StoragePromotionResult promoteToPermanentCategoryFolder(
      String category, String subFolder, String fileUrl, String identifier) {
    if (fileUrl == null || fileUrl.isBlank()) {
      return new StoragePromotionResult(null, null);
    }
    String s3Key = copyToPermanentCategoryFolder(category, subFolder, fileUrl, identifier);
    String permUrl;
    if (s3Key != null && (s3Key.startsWith("http://") || s3Key.startsWith("https://"))) {
      permUrl = s3Key;
    } else {
      permUrl = getPublicFileUrl(awsProperties.getCommonBucketName(), s3Key);
    }
    return new StoragePromotionResult(s3Key, permUrl);
  }

  public String moveFileToPermanentStorage(
      DocumentType documentType, String fileUrl, String identifier) {
    String tmpFilePath = "tmp";

    try {
      URL parsedUrl = new URL(fileUrl);
      String host = parsedUrl.getHost().split("\\.")[0];
      String key = parsedUrl.getPath().substring(1);
      String ext = key.contains(".") ? key.substring(key.lastIndexOf('.') + 1) : "jpg";

      if (!host.contains(awsProperties.getTmpBucketName())) {
        return key;
      }

      tmpFilePath = File.createTempFile("equipgrid-", "." + ext).getAbsolutePath();

      // Download from tmp bucket
      try (FileOutputStream fos = new FileOutputStream(tmpFilePath);
          S3Object s3object =
              s3client.getObject(new GetObjectRequest(awsProperties.getTmpBucketName(), key));
          InputStream inputStream = s3object.getObjectContent()) {
        byte[] buffer = new byte[8192];
        int bytesRead;
        while ((bytesRead = inputStream.read(buffer)) != -1) {
          fos.write(buffer, 0, bytesRead);
        }
      }

      // Upload to common bucket in category folder
      String objectKey = buildPermanentObjectKey(documentType, identifier, ext);
      s3client.putObject(awsProperties.getCommonBucketName(), objectKey, new File(tmpFilePath));

      log.info(
          "[Storage] File moved to permanent category folder: bucket={} key={}",
          awsProperties.getCommonBucketName(),
          objectKey);
      return objectKey;

    } catch (Exception e) {
      log.error("[Storage] Error moving file to permanent storage", e);
      throw new EquipGridException(EquipGridExceptionEnum.EG_500);
    } finally {
      try {
        Files.delete(Paths.get(tmpFilePath));
      } catch (IOException ignored) {
        // Temp file cleanup — safe to ignore
      }
    }
  }

  public String createPreSignedFileUrl(String key) {
    if (key == null || key.isBlank()) return null;
    if (key.startsWith("http://") || key.startsWith("https://")) {
      return key;
    }
    if (awsProperties.getAccessKey() == null || awsProperties.getAccessKey().isBlank()) {
      return getPublicFileUrl(awsProperties.getCommonBucketName(), key);
    }
    try {
      Date expiration = DateUtils.addMinutes(new Date(), awsProperties.getSignedUrlExpiryMinutes());
      return s3client
          .generatePresignedUrl(awsProperties.getCommonBucketName(), key, expiration)
          .toString();
    } catch (Exception e) {
      log.warn(
          "[Storage] Failed to generate presigned URL for key={}: {}. Falling back to public URL",
          key,
          e.getMessage());
      return getPublicFileUrl(awsProperties.getCommonBucketName(), key);
    }
  }

  public void deleteFileFromPermanentStorage(String key) {
    if (key == null || key.isBlank()) return;
    try {
      s3client.deleteObject(new DeleteObjectRequest(awsProperties.getCommonBucketName(), key));
      log.info("[Storage] Deleted from common bucket: {}", key);
    } catch (Exception e) {
      log.error("[Storage] Error deleting file from common bucket: {}", key, e);
      throw new EquipGridException(EquipGridExceptionEnum.EG_500);
    }
  }

  public void uploadFileWithKey(String bucketName, MultipartFile file, String key)
      throws IOException {
    try {
      if (!s3client.doesBucketExistV2(bucketName)) {
        log.info("[Storage] Bucket {} not found — creating...", bucketName);
        s3client.createBucket(bucketName);
      }
    } catch (Exception e) {
      log.debug("[Storage] Bucket existence check or creation skipped: {}", e.getMessage());
    }

    try {
      ObjectMetadata metadata = new ObjectMetadata();
      metadata.setContentLength(file.getSize());
      metadata.setContentType(
          file.getContentType() != null ? file.getContentType() : "application/octet-stream");
      s3client.putObject(bucketName, key, file.getInputStream(), metadata);
    } catch (Exception e) {
      log.error("[Storage] Error uploading file to bucket: {}", bucketName, e);
      throw new RuntimeException(e);
    }

    log.info("[Storage] Uploaded key={} to bucket={} ({} bytes)", key, bucketName, file.getSize());
  }

  private String validateMediaFile(MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new EquipGridException(
          EquipGridExceptionEnum.EG_400, "Upload file is empty or missing");
    }
    String ct = file.getContentType();
    if (ct != null && ALLOWED_IMAGE_TYPES.contains(ct)) {
      if (file.getSize() > MAX_IMAGE_SIZE_BYTES) {
        throw new EquipGridException(
            EquipGridExceptionEnum.EG_400,
            "Image exceeds maximum size of 15 MB (" + file.getSize() + " bytes received)");
      }
      return "IMAGE";
    }
    if (ct != null && ALLOWED_VIDEO_TYPES.contains(ct)) {
      if (file.getSize() > MAX_VIDEO_SIZE_BYTES) {
        throw new EquipGridException(
            EquipGridExceptionEnum.EG_400,
            "Video exceeds maximum size of 100 MB (" + file.getSize() + " bytes received)");
      }
      return "VIDEO";
    }
    if (ct != null && ALLOWED_DOCUMENT_TYPES.contains(ct)) {
      if (file.getSize() > MAX_DOCUMENT_SIZE_BYTES) {
        throw new EquipGridException(
            EquipGridExceptionEnum.EG_400,
            "Document exceeds maximum size of 25 MB (" + file.getSize() + " bytes received)");
      }
      return "DOCUMENT";
    }
    throw new EquipGridException(
        EquipGridExceptionEnum.EG_400,
        "Unsupported content type: " + ct + ". Allowed: jpeg, png, webp, gif, pdf, mp4, webm, mov");
  }

  private String appName() {
    return environment.getProperty("spring.application.name", "equipgrid");
  }

  public String getPublicFileUrl(String bucketName, String key) {
    if (key == null || key.isBlank()) return null;
    if (awsProperties.getEndpoint() != null && !awsProperties.getEndpoint().isBlank()) {
      return awsProperties.getEndpoint() + "/" + bucketName + "/" + key;
    }
    return "https://" + bucketName + ".s3." + awsProperties.getRegion() + ".amazonaws.com/" + key;
  }

  private String buildTmpUrl(String key) {
    if (awsProperties.getEndpoint() != null && !awsProperties.getEndpoint().isBlank()) {
      return awsProperties.getEndpoint() + "/" + awsProperties.getTmpBucketName() + "/" + key;
    }
    return "https://"
        + awsProperties.getTmpBucketName()
        + ".s3."
        + awsProperties.getRegion()
        + ".amazonaws.com/"
        + key;
  }
}
