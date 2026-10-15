package com.equipgrid.master.service;

import com.equipgrid.auth.entity.User;
import com.equipgrid.master.dto.request.EquipmentTypeRequest;
import com.equipgrid.master.dto.request.ManufacturerRequest;
import com.equipgrid.master.dto.request.ModelRequest;
import com.equipgrid.master.dto.response.FuzzyCheckResponse;
import com.equipgrid.master.entity.BillingUnitMaster;
import com.equipgrid.master.entity.EquipmentType;
import com.equipgrid.master.entity.MachineModel;
import com.equipgrid.master.entity.Manufacturer;
import java.util.List;

public interface IMachineMasterService {

  // --- Equipment Types ---
  List<EquipmentType> getAllEquipmentTypes(Boolean includeInactive);

  EquipmentType getEquipmentTypeById(Long id);

  EquipmentType createEquipmentType(EquipmentTypeRequest request);

  EquipmentType updateEquipmentType(Long id, EquipmentTypeRequest request);

  void deleteEquipmentType(Long id, User caller);

  FuzzyCheckResponse checkEquipmentTypeAvailability(String name, Long excludeId);

  // --- Manufacturers (OEM) ---
  List<Manufacturer> getAllManufacturers(Boolean includeInactive);

  Manufacturer getManufacturerById(Long id);

  Manufacturer createManufacturer(ManufacturerRequest request);

  Manufacturer updateManufacturer(Long id, ManufacturerRequest request);

  void deleteManufacturer(Long id, User caller);

  FuzzyCheckResponse checkManufacturerAvailability(String name, Long excludeId);

  // --- Machine Models ---
  List<MachineModel> getMachineModels(Long typeId, Long manufacturerId, Boolean includeInactive);

  MachineModel getMachineModelById(Long id);

  MachineModel createMachineModel(ModelRequest request);

  MachineModel updateMachineModel(Long id, ModelRequest request);

  void deleteMachineModel(Long id, User caller);

  FuzzyCheckResponse checkMachineModelAvailability(
      String name, Long typeId, Long manufacturerId, Long excludeId);

  // --- Billing Units ---
  List<BillingUnitMaster> getAllBillingUnits();

  BillingUnitMaster createBillingUnit(BillingUnitMaster unit);
}
