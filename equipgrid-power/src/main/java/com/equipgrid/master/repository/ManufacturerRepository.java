package com.equipgrid.master.repository;

import com.equipgrid.master.entity.Manufacturer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence repository for Manufacturer entity. Read and query operations are handled in
 * MasterQueryRepository (QueryDSL).
 */
@Repository
public interface ManufacturerRepository extends JpaRepository<Manufacturer, Long> {

  boolean existsByCodeIgnoreCase(String code);

  boolean existsByNameIgnoreCase(String name);
}
