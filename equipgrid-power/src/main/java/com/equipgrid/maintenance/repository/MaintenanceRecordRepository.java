package com.equipgrid.maintenance.repository;

import com.equipgrid.maintenance.entity.MaintenanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

/**
 * Persistence repository for MaintenanceRecord entity. Read queries and filters are handled in
 * MaintenanceQueryRepository (QueryDSL).
 */
@Repository
public interface MaintenanceRecordRepository
    extends JpaRepository<MaintenanceRecord, Long>, JpaSpecificationExecutor<MaintenanceRecord> {}
