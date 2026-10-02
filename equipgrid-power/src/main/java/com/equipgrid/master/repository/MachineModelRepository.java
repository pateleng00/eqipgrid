package com.equipgrid.master.repository;

import com.equipgrid.master.entity.MachineModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MachineModelRepository extends JpaRepository<MachineModel, Long> {
    List<MachineModel> findByActiveTrueOrderByNameAsc();
    List<MachineModel> findByTypeIdAndActiveTrueOrderByNameAsc(Long typeId);
    List<MachineModel> findByManufacturerIdAndActiveTrueOrderByNameAsc(Long manufacturerId);
    List<MachineModel> findByTypeIdAndManufacturerIdAndActiveTrueOrderByNameAsc(Long typeId, Long manufacturerId);
}
