package com.equipgrid.master.service;

import com.equipgrid.master.dto.request.ModelRequest;
import com.equipgrid.master.entity.BillingUnitMaster;
import com.equipgrid.master.entity.EquipmentType;
import com.equipgrid.master.entity.MachineModel;
import com.equipgrid.master.entity.Manufacturer;
import com.equipgrid.master.repository.BillingUnitMasterRepository;
import com.equipgrid.master.repository.EquipmentTypeRepository;
import com.equipgrid.master.repository.MachineModelRepository;
import com.equipgrid.master.repository.ManufacturerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class MachineMasterServiceImpl implements IMachineMasterService {

    private final EquipmentTypeRepository equipmentTypeRepository;
    private final ManufacturerRepository manufacturerRepository;
    private final MachineModelRepository machineModelRepository;
    private final BillingUnitMasterRepository billingUnitMasterRepository;

    @Override
    @Transactional(readOnly = true)
    public List<EquipmentType> getAllEquipmentTypes() {
        return equipmentTypeRepository.findByActiveTrueOrderByNameAsc();
    }

    @Override
    public EquipmentType createEquipmentType(EquipmentType type) {
        if (type.getActive() == null) {
            type.setActive(true);
        }
        return equipmentTypeRepository.save(type);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Manufacturer> getAllManufacturers() {
        return manufacturerRepository.findByActiveTrueOrderByNameAsc();
    }

    @Override
    public Manufacturer createManufacturer(Manufacturer manufacturer) {
        if (manufacturer.getActive() == null) {
            manufacturer.setActive(true);
        }
        return manufacturerRepository.save(manufacturer);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MachineModel> getMachineModels(Long typeId, Long manufacturerId) {
        if (typeId != null && manufacturerId != null) {
            return machineModelRepository.findByTypeIdAndManufacturerIdAndActiveTrueOrderByNameAsc(typeId, manufacturerId);
        } else if (typeId != null) {
            return machineModelRepository.findByTypeIdAndActiveTrueOrderByNameAsc(typeId);
        } else if (manufacturerId != null) {
            return machineModelRepository.findByManufacturerIdAndActiveTrueOrderByNameAsc(manufacturerId);
        } else {
            return machineModelRepository.findByActiveTrueOrderByNameAsc();
        }
    }

    @Override
    public MachineModel createMachineModel(ModelRequest request) {
        EquipmentType type = equipmentTypeRepository.findById(request.getTypeId())
                .orElseThrow(() -> new IllegalArgumentException("Type not found: " + request.getTypeId()));
        Manufacturer manufacturer = manufacturerRepository.findById(request.getManufacturerId())
                .orElseThrow(() -> new IllegalArgumentException("Manufacturer not found: " + request.getManufacturerId()));

        MachineModel model = MachineModel.builder()
                .type(type)
                .manufacturer(manufacturer)
                .name(request.getName())
                .modelNumber(request.getModelNumber())
                .specs(request.getSpecs())
                .active(true)
                .build();
        return machineModelRepository.save(model);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BillingUnitMaster> getAllBillingUnits() {
        return billingUnitMasterRepository.findByActiveTrueOrderByDisplayOrderAsc();
    }

    @Override
    public BillingUnitMaster createBillingUnit(BillingUnitMaster unit) {
        if (unit.getCode() == null || unit.getCode().isBlank()) {
            throw new IllegalArgumentException("Billing unit code is required");
        }
        if (billingUnitMasterRepository.existsByCodeIgnoreCase(unit.getCode().trim())) {
            throw new IllegalArgumentException("Billing unit with code already exists: " + unit.getCode());
        }
        unit.setCode(unit.getCode().trim().toUpperCase());
        if (unit.getActive() == null) {
            unit.setActive(true);
        }
        return billingUnitMasterRepository.save(unit);
    }
}
