package com.equipgrid.asset.repository;

import com.equipgrid.asset.entity.AssetMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AssetMediaRepository extends JpaRepository<AssetMedia, Long> {

    List<AssetMedia> findByAssetIdOrderByMediaTypeAscDisplayOrderAsc(Long assetId);

    List<AssetMedia> findByAssetIdAndMediaTypeOrderByDisplayOrderAsc(Long assetId, String mediaType);

    long countByAssetIdAndMediaType(Long assetId, String mediaType);

    Optional<AssetMedia> findByAssetIdAndMediaType(Long assetId, String mediaType);

    @Query("SELECT COALESCE(MAX(m.displayOrder), -1) FROM AssetMedia m WHERE m.asset.id = :assetId AND m.mediaType = :type")
    int findMaxDisplayOrder(@Param("assetId") Long assetId, @Param("type") String type);
}
