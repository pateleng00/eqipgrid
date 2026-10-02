package com.equipgrid.asset.repository;

import com.equipgrid.asset.entity.Asset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence repository for Asset entity.
 * Read and complex fetch queries are delegated to AssetQueryRepository (QueryDSL).
 */
@Repository
public interface AssetRepository extends JpaRepository<Asset, Long> {
}
