package com.equipgrid.master.repository;

import com.equipgrid.master.entity.MachineModel;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MachineModelRepository extends JpaRepository<MachineModel, Long> {
  @EntityGraph(attributePaths = {"type", "manufacturer"})
  List<MachineModel> findByActiveTrueOrderByNameAsc();

  @EntityGraph(attributePaths = {"type", "manufacturer"})
  List<MachineModel> findAllByOrderByNameAsc();

  @EntityGraph(attributePaths = {"type", "manufacturer"})
  List<MachineModel> findByTypeIdAndActiveTrueOrderByNameAsc(Long typeId);

  @EntityGraph(attributePaths = {"type", "manufacturer"})
  List<MachineModel> findByTypeIdOrderByNameAsc(Long typeId);

  @EntityGraph(attributePaths = {"type", "manufacturer"})
  List<MachineModel> findByManufacturerIdAndActiveTrueOrderByNameAsc(Long manufacturerId);

  @EntityGraph(attributePaths = {"type", "manufacturer"})
  List<MachineModel> findByManufacturerIdOrderByNameAsc(Long manufacturerId);

  @EntityGraph(attributePaths = {"type", "manufacturer"})
  List<MachineModel> findByTypeIdAndManufacturerIdAndActiveTrueOrderByNameAsc(
      Long typeId, Long manufacturerId);

  @EntityGraph(attributePaths = {"type", "manufacturer"})
  List<MachineModel> findByTypeIdAndManufacturerIdOrderByNameAsc(Long typeId, Long manufacturerId);

  boolean existsByTypeId(Long typeId);

  boolean existsByManufacturerId(Long manufacturerId);

  boolean existsByNameIgnoreCase(String name);
}
