package com.equipgrid.master.repository;

import com.equipgrid.master.entity.BillingUnitMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence repository for BillingUnitMaster entity. Read and query operations are handled in
 * MasterQueryRepository (QueryDSL).
 */
@Repository
public interface BillingUnitMasterRepository extends JpaRepository<BillingUnitMaster, Long> {

  boolean existsByCodeIgnoreCase(String code);
}
