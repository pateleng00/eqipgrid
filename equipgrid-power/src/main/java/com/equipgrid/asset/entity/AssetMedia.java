package com.equipgrid.asset.entity;

import com.equipgrid.common.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "asset_media",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uq_asset_media_order",
            columnNames = {"asset_id", "media_type", "display_order"}),
    indexes = @Index(name = "idx_asset_media_asset_id", columnList = "asset_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssetMedia extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @JsonIgnore
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "asset_id", nullable = false)
  private Asset asset;

  @Column(name = "media_type", nullable = false, length = 16)
  private String mediaType; // "IMAGE" | "VIDEO"

  @Column(name = "s3_key", nullable = false, length = 512)
  private String s3Key;

  @Transient private String url;

  @Builder.Default
  @Column(name = "display_order", nullable = false)
  private Integer displayOrder = 0;

  @Column(name = "file_name", length = 255)
  private String fileName;

  @Column(name = "content_type", length = 64)
  private String contentType;

  @Column(name = "file_size_bytes")
  private Long fileSizeBytes;

  @Column(name = "duration_seconds")
  private Integer durationSeconds;
}
