package com.equipgrid.maintenance.repository;

import com.equipgrid.maintenance.entity.MaintenanceDamageComponent;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MaintenanceDamageComponentRepository
    extends JpaRepository<MaintenanceDamageComponent, Long> {

  List<MaintenanceDamageComponent> findByActiveTrueOrderByDisplayOrderAsc();

  Optional<MaintenanceDamageComponent> findByPartCode(String partCode);
}
