package com.equipgrid.maintenance.repository;

import com.equipgrid.maintenance.entity.MaintenanceDamageComponent;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MaintenanceDamageComponentRepository
    extends JpaRepository<MaintenanceDamageComponent, Long> {

  List<MaintenanceDamageComponent> findByActiveTrueOrderByDisplayOrderAsc();

  @Query(
      "SELECT c FROM MaintenanceDamageComponent c WHERE c.active = true AND "
          + "(c.isUniversal = true OR c.equipmentType.id = :equipmentTypeId OR c.equipmentType IS NULL) "
          + "ORDER BY c.isUniversal ASC, c.displayOrder ASC, c.name ASC")
  List<MaintenanceDamageComponent> findActiveByTypeOrUniversal(
      @Param("equipmentTypeId") Long equipmentTypeId);

  @Query(
      "SELECT c FROM MaintenanceDamageComponent c WHERE c.active = true AND "
          + "(c.isUniversal = true OR c.equipmentTypeCode = :typeCode OR c.equipmentType.code = :typeCode) "
          + "ORDER BY c.isUniversal ASC, c.displayOrder ASC, c.name ASC")
  List<MaintenanceDamageComponent> findActiveByTypeCodeOrUniversal(
      @Param("typeCode") String typeCode);

  Optional<MaintenanceDamageComponent> findByPartCode(String partCode);
}
