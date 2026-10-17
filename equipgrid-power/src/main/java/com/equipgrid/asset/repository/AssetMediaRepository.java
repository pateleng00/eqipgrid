package com.equipgrid.asset.repository;

import com.equipgrid.asset.entity.AssetMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence repository for AssetMedia entity. Read and count queries are moved to
 * AssetQueryRepository (QueryDSL).
 */
@Repository
public interface AssetMediaRepository extends JpaRepository<AssetMedia, Long> {}
