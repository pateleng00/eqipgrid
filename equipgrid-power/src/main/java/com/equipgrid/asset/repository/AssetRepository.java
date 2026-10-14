package com.equipgrid.asset.repository;

import com.equipgrid.asset.entity.Asset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface AssetRepository extends JpaRepository<Asset, Long> {
}
