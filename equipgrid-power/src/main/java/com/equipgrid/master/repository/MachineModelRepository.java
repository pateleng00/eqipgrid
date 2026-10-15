package com.equipgrid.master.repository;

import com.equipgrid.master.entity.MachineModel;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MachineModelRepository extends JpaRepository<MachineModel, Long> {
  List<MachineModel> findByActiveTrueOrderByNameAsc();

  List<MachineModel> findAllByOrderByNameAsc();

  List<MachineModel> findByTypeIdAndActiveTrueOrderByNameAsc(Long typeId);

  List<MachineModel> findByTypeIdOrderByNameAsc(Long typeId);

  List<MachineModel> findByManufacturerIdAndActiveTrueOrderByNameAsc(Long manufacturerId);

  List<MachineModel> findByManufacturerIdOrderByNameAsc(Long manufacturerId);

  List<MachineModel> findByTypeIdAndManufacturerIdAndActiveTrueOrderByNameAsc(
      Long typeId, Long manufacturerId);

  List<MachineModel> findByTypeIdAndManufacturerIdOrderByNameAsc(Long typeId, Long manufacturerId);

  boolean existsByTypeId(Long typeId);

  boolean existsByManufacturerId(Long manufacturerId);

  boolean existsByNameIgnoreCase(String name);
}
