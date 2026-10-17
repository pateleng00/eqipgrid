package com.equipgrid.farmlocation.repository;

import com.equipgrid.farmlocation.entity.FarmLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence repository for FarmLocation entity. Read and GIS boundary lookups are in
 * FarmLocationQueryRepository (QueryDSL).
 */
@Repository
public interface FarmLocationRepository extends JpaRepository<FarmLocation, Long> {}
