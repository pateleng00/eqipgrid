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

/**
 * Central S3 storage service for EquipGrid.
 *
 * <p><b>Two-bucket strategy:</b>
 * <ol>
 *   <li>Client uploads to the <em>tmp</em> bucket first (via {@link #uploadFileTemporary} or presigned PUT).</li>
 *   <li>After business validation the file is promoted to the <em>common</em> (permanent) bucket via
 *       {@link #copyToPermanentStorage} (preferred — S3-to-S3, no server I/O) or
 *       {@link #moveFileToPermanentStorage} (download-then-upload fallback).</li>
 * </ol>
 *
 * <p>Mirrors the Stride Observatory StorageService pattern.
 */
@Slf4j
@Component
@AllArgsConstructor
public class StorageService {

    private static final long MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024L; // 10 MB

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif"
    );

    private final AmazonS3 s3client;
    private final AwsProperties awsProperties;
    private final Environment environment;

    // ─────────────────────────────────────────────────────────────────────────
    // Temporary Upload
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Uploads a file to the temporary bucket.
     * The file is staged here until validated and promoted to permanent storage.
     *
     * @param file the multipart file from the HTTP request
     * @return map with key {@code "url"} pointing to the tmp bucket URL
     */
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
            throw new EquipGridException(EquipGridExceptionEnum.SGO_500);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Presigned URL — Download
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Generates a presigned GET URL for a file in the common (permanent) bucket.
     *
     * @param request contains the S3 object key
     * @return map with key {@code "url"} containing the presigned download URL
     */
    public Map<String, String> getPreSignedDownloadUrlFromCommonBucket(DownloadRequest request) {
        String url = getPreSignedDownloadUrl(
                awsProperties.getCommonBucketName(),
                request.getKey(),
                awsProperties.getSignedUrlExpiryMinutes());
        return Map.of("url", url);
    }

    /**
     * Generates a presigned GET URL for any bucket and key.
     *
     * @param bucketName             target S3 bucket
     * @param fileName               S3 object key
     * @param expirationTimeMinutes  must be &gt; 0
     */
    public String getPreSignedDownloadUrl(String bucketName, String fileName, Integer expirationTimeMinutes) {
        if (expirationTimeMinutes <= 0) {
            throw new IllegalArgumentException("Expiration time must be a positive value.");
        }
        Date expiration = DateUtils.addMinutes(new Date(), expirationTimeMinutes);
        GeneratePresignedUrlRequest presignedUrlRequest =
                new GeneratePresignedUrlRequest(bucketName, fileName)
                        .withMethod(HttpMethod.GET)
                        .withExpiration(expiration);
        URL url = s3client.generatePresignedUrl(presignedUrlRequest);
        log.info("[Storage] Presigned GET URL generated for key={}", fileName);
        return url.toString();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Presigned URL — Upload (PUT, for large files / direct client uploads)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Generates a presigned PUT URL so the client can upload a file directly to
     * the tmp bucket without routing through the application server.
     * Primarily used for large media files (inspection videos, etc.).
     *
     * @param request upload metadata — file name, content type
     * @return presigned upload URL + the tmp URL where the file will reside
     */
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

    // ─────────────────────────────────────────────────────────────────────────
    // Promotion — Tmp → Permanent
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Promotes a file from the tmp bucket to the common (permanent) bucket using
     * a <strong>server-side S3 copy</strong> — no data flows through the application server.
     * Preferred over {@link #moveFileToPermanentStorage}.
     *
     * <p>If the URL is already in the common bucket, returns the existing key unchanged.
     *
     * @param documentType document classification — determines the S3 path
     * @param fileUrl      tmp bucket URL as returned by {@link #uploadFileTemporary}
     * @param identifier   unique identifier for the object key (e.g. asset tag, booking number)
     * @return the final S3 object key in the common bucket
     */
    public String copyToPermanentStorage(DocumentType documentType, String fileUrl, String identifier) {
        String mapping   = documentType.getFileStorageName();
        String category  = documentType.getDocumentCategory().getFileStorageName();

        try {
            URL parsedUrl = new URL(fileUrl);
            String host = parsedUrl.getHost().split("\\.")[0];
            String key  = parsedUrl.getPath().substring(1);
            String ext  = key.substring(key.lastIndexOf('.') + 1);

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
            throw new EquipGridException(EquipGridExceptionEnum.SGO_500);
        }
    }

    /**
     * Promotes a file from tmp to permanent storage by <strong>downloading then re-uploading</strong>.
     * Use this as a fallback when cross-region copy is unavailable.
     * Prefer {@link #copyToPermanentStorage} for same-region operations.
     *
     * @param documentType document classification
     * @param fileUrl      tmp bucket URL
     * @param identifier   unique identifier for the destination key
     * @return the final S3 object key in the common bucket
     */
    public String moveFileToPermanentStorage(DocumentType documentType, String fileUrl, String identifier) {
        String mapping  = documentType.getFileStorageName();
        String category = documentType.getDocumentCategory().getFileStorageName();
        String tmpFilePath = "tmp";

        try {
            URL parsedUrl = new URL(fileUrl);
            String host = parsedUrl.getHost().split("\\.")[0];
            String key  = parsedUrl.getPath().substring(1);
            String ext  = key.substring(key.lastIndexOf('.') + 1);

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
            throw new EquipGridException(EquipGridExceptionEnum.SGO_500);
        } finally {
            try {
                Files.delete(Paths.get(tmpFilePath));
            } catch (IOException ignored) {
                // Temp file cleanup — safe to ignore
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Access URLs
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Generates a short-lived presigned GET URL for a key in the common bucket.
     * Returns {@code null} if the key is null/blank or the URL cannot be generated.
     *
     * @param key S3 object key in the common bucket
     */
    public String createPreSignedFileUrl(String key) {
        if (key == null || key.isBlank()) return null;
        try {
            Date expiration = DateUtils.addMinutes(new Date(), awsProperties.getSignedUrlExpiryMinutes());
            return s3client.generatePresignedUrl(awsProperties.getCommonBucketName(), key, expiration).toString();
        } catch (Exception e) {
            log.warn("[Storage] Failed to generate presigned URL for key={}: {}", key, e.getMessage());
            return null;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Download
    // ─────────────────────────────────────────────────────────────────────────

    /** Downloads an object from the common (permanent) bucket. */
    public S3Object downloadFile(String key) {
        return s3client.getObject(new GetObjectRequest(awsProperties.getCommonBucketName(), key));
    }

    /** Downloads an object from the temporary bucket. */
    public S3Object downloadTempFile(String key) {
        return s3client.getObject(new GetObjectRequest(awsProperties.getTmpBucketName(), key));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Delete
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Deletes an object from the common (permanent) bucket.
     * Returns the deleted key, or {@code null} if key is blank.
     */
    public String deleteFileFromPermanentStorage(String key) {
        if (key == null || key.isBlank()) return null;
        try {
            s3client.deleteObject(new DeleteObjectRequest(awsProperties.getCommonBucketName(), key));
            log.info("[Storage] Deleted from common bucket: {}", key);
            return key;
        } catch (Exception e) {
            log.error("[Storage] Error deleting file from common bucket: {}", key, e);
            throw new EquipGridException(EquipGridExceptionEnum.SGO_500);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Uploads a file to the given bucket with the specified key.
     * Creates the bucket if it does not exist (useful for LocalStack / first-run).
     */
    public PutObjectResult uploadFileWithKey(String bucketName, MultipartFile file, String key) throws IOException {
        if (!s3client.doesBucketExistV2(bucketName)) {
            log.info("[Storage] Bucket {} not found — creating...", bucketName);
            s3client.createBucket(bucketName);
        }

        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentLength(file.getSize());
        metadata.setContentType(file.getContentType() != null ? file.getContentType() : "application/octet-stream");

        PutObjectResult result = s3client.putObject(
                new PutObjectRequest(bucketName, key, file.getInputStream(), metadata));

        log.info("[Storage] Uploaded key={} to bucket={} ({} bytes)", key, bucketName, file.getSize());
        return result;
    }

    private void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new EquipGridException(EquipGridExceptionEnum.SGO_400, "Upload file is empty or missing");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new EquipGridException(EquipGridExceptionEnum.SGO_400,
                    "File exceeds maximum size of 10 MB (" + file.getSize() + " bytes received)");
        }
        String ct = file.getContentType();
        if (ct == null || !ALLOWED_IMAGE_TYPES.contains(ct)) {
            throw new EquipGridException(EquipGridExceptionEnum.SGO_400,
                    "Unsupported content type: " + ct + ". Allowed: jpeg, png, webp, gif");
        }
    }

    private String appName() {
        return environment.getProperty("spring.application.name", "equipgrid");
    }

    private String buildTmpUrl(String key) {
        if (awsProperties.getEndpoint() != null && !awsProperties.getEndpoint().isBlank()) {
            return awsProperties.getEndpoint() + "/" + awsProperties.getTmpBucketName() + "/" + key;
        }
        return "https://" + awsProperties.getTmpBucketName() + ".s3." + awsProperties.getRegion() + ".amazonaws.com/" + key;
    }
}
