package com.equipgrid.master.repository;

import com.equipgrid.master.entity.MachineModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence repository for MachineModel entity. Read and query operations are handled in
 * MasterQueryRepository (QueryDSL).
 */
@Repository
public interface MachineModelRepository extends JpaRepository<MachineModel, Long> {

  boolean existsByModelNumberIgnoreCase(String modelNumber);

  boolean existsByNameIgnoreCase(String name);

  boolean existsByTypeId(Long typeId);

  boolean existsByManufacturerId(Long manufacturerId);
}
