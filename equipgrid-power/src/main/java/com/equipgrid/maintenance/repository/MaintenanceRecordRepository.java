package com.equipgrid.maintenance.repository;

import com.equipgrid.maintenance.entity.MaintenanceRecord;
import com.equipgrid.maintenance.enums.MaintenanceStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface MaintenanceRecordRepository
    extends JpaRepository<MaintenanceRecord, Long>, JpaSpecificationExecutor<MaintenanceRecord> {

  Optional<MaintenanceRecord> findByTicketNumber(String ticketNumber);

  List<MaintenanceRecord> findByHubIdOrderByCreatedAtDesc(Long hubId);

  List<MaintenanceRecord> findByHubIdAndStatusNotOrderByCreatedAtDesc(
      Long hubId, MaintenanceStatus status);

  List<MaintenanceRecord> findByAssetIdOrderByCreatedAtDesc(Long assetId);

  List<MaintenanceRecord> findByStatusOrderByCreatedAtDesc(MaintenanceStatus status);

  List<MaintenanceRecord> findByStatusNotOrderByCreatedAtDesc(MaintenanceStatus status);

  long countByHubIdAndStatusNot(Long hubId, MaintenanceStatus status);

  long countByStatusNot(MaintenanceStatus status);
}
