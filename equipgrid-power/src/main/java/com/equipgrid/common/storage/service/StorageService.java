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
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.time.DateUtils;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

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

@Slf4j
@Component
@AllArgsConstructor
public class StorageService {

    private static final long MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024L; // 10 MB

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp", "image/gif");

    private final AmazonS3 s3client;
    private final AwsProperties awsProperties;
    private final Environment environment;

    public Map<String, String> uploadFileTemporary(MultipartFile file) {
        validateImageFile(file);

        String originalFilename = file.getOriginalFilename();
        String sanitizedFilename = originalFilename == null ? "file" : originalFilename.replaceAll("\\s+", "_");
        String key = appName() + "/" + UUID.randomUUID() + "_" + sanitizedFilename;
        String fileUrl = buildTmpUrl(key);

        try {
            uploadFileWithKey(awsProperties.getTmpBucketName(), file, key);
            log.info("[Storage] Temporary upload: {}", fileUrl);
            return Map.of("url", fileUrl);
        } catch (IOException e) {
            log.error("[Storage] Error uploading temporary file", e);
            throw new EquipGridException(EquipGridExceptionEnum.EG_500);
        }
    }

    public Map<String, String> getPreSignedDownloadUrlFromCommonBucket(DownloadRequest request) {
        String url = getPreSignedDownloadUrl(
                awsProperties.getCommonBucketName(),
                request.getKey(),
                awsProperties.getSignedUrlExpiryMinutes());
        return Map.of("url", url);
    }

    public String getPreSignedDownloadUrl(String bucketName, String fileName, Integer expirationTimeMinutes) {
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
            log.warn("[Storage] Failed to generate presigned GET URL for key={}: {}. Falling back to public URL", fileName, e.getMessage());
            return getPublicFileUrl(bucketName, fileName);
        }
    }

    public PresignedUploadResponse generatePresignedUploadUrl(PresignedUploadRequest request) {
        String sanitizedFilename = request.getFileName().replaceAll("\\s+", "_");
        String key = appName() + "/" + UUID.randomUUID() + "_" + sanitizedFilename;
        String tempUrl = buildTmpUrl(key);

        Date expiration = DateUtils.addMinutes(new Date(), awsProperties.getSignedUrlExpiryMinutes());
        GeneratePresignedUrlRequest presignedUrlRequest = new GeneratePresignedUrlRequest(
                awsProperties.getTmpBucketName(), key)
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

    public String copyToPermanentStorage(DocumentType documentType, String fileUrl, String identifier) {
        String mapping = documentType.getFileStorageName();
        String category = documentType.getDocumentCategory().getFileStorageName();

        try {
            URL parsedUrl = new URL(fileUrl);
            String host = parsedUrl.getHost().split("\\.")[0];
            String key = parsedUrl.getPath().substring(1);
            String ext = key.substring(key.lastIndexOf('.') + 1);

            // Already in permanent storage — nothing to do
            if (!host.equals(awsProperties.getTmpBucketName())) {
                log.info("[Storage] File already in permanent storage: {}", key);
                return key;
            }

            String objectKey = appName() + "/" + category + "/" + mapping + "/" + identifier + "." + ext;

            CopyObjectRequest copyRequest = new CopyObjectRequest(
                    awsProperties.getTmpBucketName(), key,
                    awsProperties.getCommonBucketName(), objectKey);
            s3client.copyObject(copyRequest);

            log.info("[Storage] File copied to permanent bucket: {}", objectKey);
            return objectKey;

        } catch (Exception e) {
            log.error("[Storage] Error copying file to permanent storage", e);
            throw new EquipGridException(EquipGridExceptionEnum.EG_500);
        }
    }

    public String moveFileToPermanentStorage(DocumentType documentType, String fileUrl, String identifier) {
        String mapping = documentType.getFileStorageName();
        String category = documentType.getDocumentCategory().getFileStorageName();
        String tmpFilePath = "tmp";

        try {
            URL parsedUrl = new URL(fileUrl);
            String host = parsedUrl.getHost().split("\\.")[0];
            String key = parsedUrl.getPath().substring(1);
            String ext = key.substring(key.lastIndexOf('.') + 1);

            if (!host.equals(awsProperties.getTmpBucketName())) {
                return key;
            }

            tmpFilePath = File.createTempFile("equipgrid-", "." + ext).getAbsolutePath();

            // Download from tmp bucket
            try (FileOutputStream fos = new FileOutputStream(tmpFilePath);
                 S3Object s3object = s3client.getObject(new GetObjectRequest(awsProperties.getTmpBucketName(), key));
                 InputStream inputStream = s3object.getObjectContent()) {
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = inputStream.read(buffer)) != -1) {
                    fos.write(buffer, 0, bytesRead);
                }
            }

            // Upload to common bucket
            String objectKey = appName() + "/" + category + "/" + mapping + "/" + identifier + "." + ext;
            s3client.putObject(awsProperties.getCommonBucketName(), objectKey, new File(tmpFilePath));

            log.info("[Storage] File moved to permanent bucket: {}", objectKey);
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
        if (awsProperties.getAccessKey() == null || awsProperties.getAccessKey().isBlank()) {
            return getPublicFileUrl(awsProperties.getCommonBucketName(), key);
        }
        try {
            Date expiration = DateUtils.addMinutes(new Date(), awsProperties.getSignedUrlExpiryMinutes());
            return s3client.generatePresignedUrl(awsProperties.getCommonBucketName(), key, expiration).toString();
        } catch (Exception e) {
            log.warn("[Storage] Failed to generate presigned URL for key={}: {}. Falling back to public URL", key, e.getMessage());
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

    public void uploadFileWithKey(String bucketName, MultipartFile file, String key) throws IOException {
        if (!s3client.doesBucketExistV2(bucketName)) {
            log.info("[Storage] Bucket {} not found — creating...", bucketName);
            s3client.createBucket(bucketName);
        }


        try {
            ObjectMetadata metadata = new ObjectMetadata();
            metadata.setContentLength(file.getSize());
            metadata.setContentType(file.getContentType() != null ? file.getContentType() : "application/octet-stream");
        } catch (Exception e) {
            log.error("[Storage] Error uploading file to permanent storage", e);
            throw new RuntimeException(e);
        }

        log.info("[Storage] Uploaded key={} to bucket={} ({} bytes)", key, bucketName, file.getSize());
    }

    private void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new EquipGridException(EquipGridExceptionEnum.EG_400, "Upload file is empty or missing");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new EquipGridException(EquipGridExceptionEnum.EG_400,
                    "File exceeds maximum size of 10 MB (" + file.getSize() + " bytes received)");
        }
        String ct = file.getContentType();
        if (ct == null || !ALLOWED_IMAGE_TYPES.contains(ct)) {
            throw new EquipGridException(EquipGridExceptionEnum.EG_400,
                    "Unsupported content type: " + ct + ". Allowed: jpeg, png, webp, gif");
        }
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
        return "https://" + awsProperties.getTmpBucketName() + ".s3." + awsProperties.getRegion() + ".amazonaws.com/" + key;
    }
}
