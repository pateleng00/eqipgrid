package com.equipgrid.master.service;

import com.equipgrid.master.dto.request.ModelRequest;
import com.equipgrid.master.entity.BillingUnitMaster;
import com.equipgrid.master.entity.EquipmentType;
import com.equipgrid.master.entity.MachineModel;
import com.equipgrid.master.entity.Manufacturer;

import java.util.List;

public interface IMachineMasterService {

    List<EquipmentType> getAllEquipmentTypes();

    EquipmentType createEquipmentType(EquipmentType type);

    List<Manufacturer> getAllManufacturers();

    Manufacturer createManufacturer(Manufacturer manufacturer);

    List<MachineModel> getMachineModels(Long typeId, Long manufacturerId);

    MachineModel createMachineModel(ModelRequest request);

    List<BillingUnitMaster> getAllBillingUnits();

    BillingUnitMaster createBillingUnit(BillingUnitMaster unit);
}
