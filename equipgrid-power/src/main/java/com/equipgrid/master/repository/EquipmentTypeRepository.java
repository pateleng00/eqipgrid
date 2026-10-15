package com.equipgrid.master.repository;

import com.equipgrid.master.entity.EquipmentType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EquipmentTypeRepository extends JpaRepository<EquipmentType, Long> {
  List<EquipmentType> findByActiveTrueOrderByNameAsc();

  List<EquipmentType> findAllByOrderByNameAsc();

  boolean existsByCodeIgnoreCase(String code);

  boolean existsByNameIgnoreCase(String name);
}
