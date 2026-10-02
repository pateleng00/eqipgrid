package com.equipgrid.asset.entity;

import com.equipgrid.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * Stores individual media items (images and one short video) for an {@link Asset}.
 *
 * <p>Key constraints:
 * <ul>
 *   <li>Max 4 images per asset ({@code media_type = 'IMAGE'})</li>
 *   <li>Max 1 video per asset ({@code media_type = 'VIDEO'}, max 30 seconds)</li>
 *   <li>{@code display_order} (0-based) controls carousel ordering</li>
 *   <li>{@code s3_key} is the permanent S3 object key in the common bucket</li>
 * </ul>
 */
@Entity
@Table(name = "asset_media",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_asset_media_order",
        columnNames = {"asset_id", "media_type", "display_order"}
    ),
    indexes = @Index(name = "idx_asset_media_asset_id", columnList = "asset_id")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssetMedia extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id", nullable = false)
    private Asset asset;

    /**
     * Media type — {@code IMAGE} or {@code VIDEO}.
     * Stored as a VARCHAR so adding future types (360, PDF) doesn't require schema change.
     */
    @Column(name = "media_type", nullable = false, length = 16)
    private String mediaType; // "IMAGE" | "VIDEO"

    /** Permanent S3 object key in the common bucket (used to generate presigned URLs). */
    @Column(name = "s3_key", nullable = false, length = 512)
    private String s3Key;

    /** Public or presigned URL — populated at response time, not stored permanently. */
    @Transient
    private String url;

    /** 0-based carousel position within the same {@code mediaType} for this asset. */
    @Builder.Default
    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;

    /** Original filename as uploaded — stored for UI display and downloads. */
    @Column(name = "file_name", length = 255)
    private String fileName;

    /** MIME type (e.g. {@code image/jpeg}, {@code video/mp4}). */
    @Column(name = "content_type", length = 64)
    private String contentType;

    /** File size in bytes — used for UI progress display. */
    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    /** Duration in seconds (applicable for VIDEO type only). */
    @Column(name = "duration_seconds")
    private Integer durationSeconds;
}
