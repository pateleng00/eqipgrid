package com.equipgrid.master.repository;

import com.equipgrid.master.entity.EquipmentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence repository for EquipmentType entity. Read and query operations are handled in
 * MasterQueryRepository (QueryDSL).
 */
@Repository
public interface EquipmentTypeRepository extends JpaRepository<EquipmentType, Long> {

  boolean existsByCodeIgnoreCase(String code);

  boolean existsByNameIgnoreCase(String name);
}
