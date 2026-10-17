package com.equipgrid.maintenance.repository;

import com.equipgrid.maintenance.entity.MaintenanceDamageComponent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MaintenanceDamageComponentRepository
    extends JpaRepository<MaintenanceDamageComponent, Long> {}
