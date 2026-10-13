package com.equipgrid.master.repository;

import com.equipgrid.master.entity.BillingUnitMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BillingUnitMasterRepository extends JpaRepository<BillingUnitMaster, Long> {

    List<BillingUnitMaster> findByActiveTrueOrderByDisplayOrderAsc();

    Optional<BillingUnitMaster> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);
}
