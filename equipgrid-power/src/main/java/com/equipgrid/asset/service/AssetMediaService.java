package com.equipgrid.asset.service;

import com.equipgrid.asset.dto.response.AssetMediaResponse;
import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.entity.AssetMedia;
import com.equipgrid.asset.repository.AssetMediaRepository;
import com.equipgrid.audit.service.IAuditService;
import com.equipgrid.common.Exceptions;
import com.equipgrid.common.exception.EquipGridException;
import com.equipgrid.common.exception.EquipGridExceptionEnum;
import com.equipgrid.common.storage.enums.DocumentType;
import com.equipgrid.common.storage.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Manages the media gallery for each asset:
 * <ul>
 *   <li>Upload up to 4 images per machine</li>
 *   <li>Upload exactly 1 short video (max 30 seconds) per machine</li>
 *   <li>Delete any media item by ID</li>
 *   <li>List all media for a machine with presigned access URLs</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AssetMediaService {

    private static final int MAX_IMAGES = 4;
    private static final int MAX_VIDEOS = 1;
    private static final int MAX_VIDEO_DURATION_SECONDS = 30;
    private static final long MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024L;   // 10 MB
    private static final long MAX_VIDEO_SIZE_BYTES  = 100 * 1024 * 1024L; // 100 MB

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif"
    );
    private static final Set<String> ALLOWED_VIDEO_TYPES = Set.of(
            "video/mp4", "video/webm", "video/quicktime"
    );

    private final AssetMediaRepository mediaRepository;
    private final IAssetService assetService;
    private final StorageService storageService;
    private final IAuditService auditService;

    // ─── List ─────────────────────────────────────────────────────────────────

    public List<AssetMediaResponse> listMedia(Long assetId) {
        assetService.getAssetById(assetId); // validates asset exists
        return mediaRepository
                .findByAssetIdOrderByMediaTypeAscDisplayOrderAsc(assetId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // ─── Upload Image ─────────────────────────────────────────────────────────

    @Transactional
    public AssetMediaResponse uploadImage(Long assetId, MultipartFile file, String actor) {
        Asset asset = assetService.getAssetById(assetId);

        // Enforce image limit
        long existingCount = mediaRepository.countByAssetIdAndMediaType(assetId, "IMAGE");
        if (existingCount >= MAX_IMAGES) {
            throw new EquipGridException(EquipGridExceptionEnum.EG_BUSINESS_RULE_VIOLATION,
                    "Maximum " + MAX_IMAGES + " images allowed per machine. Delete an existing image first.");
        }

        // Validate
        validateImageFile(file);

        // Upload: tmp → permanent
        Map<String, String> tmp = storageService.uploadFileTemporary(file);
        String identifier = asset.getAssetTag().toLowerCase() + "_img_" + System.currentTimeMillis();
        String s3Key = storageService.copyToPermanentStorage(DocumentType.ASSET_IMAGE, tmp.get("url"), identifier);

        int nextOrder = mediaRepository.findMaxDisplayOrder(assetId, "IMAGE") + 1;

        AssetMedia media = AssetMedia.builder()
                .asset(asset)
                .mediaType("IMAGE")
                .s3Key(s3Key)
                .displayOrder(nextOrder)
                .fileName(file.getOriginalFilename())
                .contentType(file.getContentType())
                .fileSizeBytes(file.getSize())
                .build();

        AssetMedia saved = mediaRepository.save(media);
        auditService.log("ASSET_MEDIA", asset.getAssetTag(), "IMAGE_UPLOAD", actor,
                "Image uploaded: " + s3Key + " (order=" + nextOrder + ")");

        log.info("[AssetMedia] Image uploaded for asset={} key={}", asset.getAssetTag(), s3Key);
        return toResponse(saved);
    }

    // ─── Upload Video ──────────────────────────────────────────────────────────

    @Transactional
    public AssetMediaResponse uploadVideo(Long assetId, MultipartFile file,
                                          Integer durationSeconds, String actor) {
        Asset asset = assetService.getAssetById(assetId);

        // Enforce single video limit
        long existingVideo = mediaRepository.countByAssetIdAndMediaType(assetId, "VIDEO");
        if (existingVideo >= MAX_VIDEOS) {
            throw new EquipGridException(EquipGridExceptionEnum.EG_BUSINESS_RULE_VIOLATION,
                    "Only 1 video is allowed per machine. Delete the existing video first.");
        }

        // Validate duration
        if (durationSeconds != null && durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
            throw new EquipGridException(EquipGridExceptionEnum.EG_BUSINESS_RULE_VIOLATION,
                    "Video must be " + MAX_VIDEO_DURATION_SECONDS + " seconds or less (received " + durationSeconds + "s).");
        }

        // Validate file
        validateVideoFile(file);

        // Upload: tmp → permanent
        Map<String, String> tmp = storageService.uploadFileTemporary(file);
        String identifier = asset.getAssetTag().toLowerCase() + "_vid_" + System.currentTimeMillis();
        String s3Key = storageService.copyToPermanentStorage(DocumentType.ASSET_DOCUMENT, tmp.get("url"), identifier);

        AssetMedia media = AssetMedia.builder()
                .asset(asset)
                .mediaType("VIDEO")
                .s3Key(s3Key)
                .displayOrder(0)
                .fileName(file.getOriginalFilename())
                .contentType(file.getContentType())
                .fileSizeBytes(file.getSize())
                .durationSeconds(durationSeconds)
                .build();

        AssetMedia saved = mediaRepository.save(media);
        auditService.log("ASSET_MEDIA", asset.getAssetTag(), "VIDEO_UPLOAD", actor,
                "Video uploaded: " + s3Key);

        log.info("[AssetMedia] Video uploaded for asset={} key={}", asset.getAssetTag(), s3Key);
        return toResponse(saved);
    }

    // ─── Delete ───────────────────────────────────────────────────────────────

    @Transactional
    public void deleteMedia(Long assetId, Long mediaId, String actor) {
        AssetMedia media = mediaRepository.findById(mediaId)
                .orElseThrow(() -> new Exceptions.ResourceNotFoundException("Media not found: " + mediaId));

        if (!media.getAsset().getId().equals(assetId)) {
            throw new EquipGridException(EquipGridExceptionEnum.SGO_403);
        }

        storageService.deleteFileFromPermanentStorage(media.getS3Key());
        mediaRepository.delete(media);

        auditService.log("ASSET_MEDIA", String.valueOf(assetId), "MEDIA_DELETE", actor,
                "Deleted media: " + media.getS3Key());
        log.info("[AssetMedia] Deleted mediaId={} from assetId={}", mediaId, assetId);
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    private AssetMediaResponse toResponse(AssetMedia m) {
        String url = storageService.createPreSignedFileUrl(m.getS3Key());
        return AssetMediaResponse.builder()
                .id(m.getId())
                .mediaType(m.getMediaType())
                .url(url)
                .s3Key(m.getS3Key())
                .displayOrder(m.getDisplayOrder())
                .fileName(m.getFileName())
                .contentType(m.getContentType())
                .fileSizeBytes(m.getFileSizeBytes())
                .durationSeconds(m.getDurationSeconds())
                .build();
    }

    private void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty())
            throw new EquipGridException(EquipGridExceptionEnum.SGO_400, "Image file is empty");
        if (file.getSize() > MAX_IMAGE_SIZE_BYTES)
            throw new EquipGridException(EquipGridExceptionEnum.SGO_400, "Image exceeds 10 MB limit");
        if (!ALLOWED_IMAGE_TYPES.contains(file.getContentType()))
            throw new EquipGridException(EquipGridExceptionEnum.SGO_400,
                    "Unsupported image type: " + file.getContentType());
    }

    private void validateVideoFile(MultipartFile file) {
        if (file == null || file.isEmpty())
            throw new EquipGridException(EquipGridExceptionEnum.SGO_400, "Video file is empty");
        if (file.getSize() > MAX_VIDEO_SIZE_BYTES)
            throw new EquipGridException(EquipGridExceptionEnum.SGO_400, "Video exceeds 100 MB limit");
        if (!ALLOWED_VIDEO_TYPES.contains(file.getContentType()))
            throw new EquipGridException(EquipGridExceptionEnum.SGO_400,
                    "Unsupported video type: " + file.getContentType() + ". Allowed: mp4, webm, mov");
    }
}
