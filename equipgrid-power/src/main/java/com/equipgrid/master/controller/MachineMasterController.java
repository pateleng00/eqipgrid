package com.equipgrid.master.controller;

import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.auth.entity.User;
import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.master.dto.request.EquipmentTypeRequest;
import com.equipgrid.master.dto.request.ManufacturerRequest;
import com.equipgrid.master.dto.request.ModelRequest;
import com.equipgrid.master.dto.response.FuzzyCheckResponse;
import com.equipgrid.master.entity.BillingUnitMaster;
import com.equipgrid.master.entity.EquipmentType;
import com.equipgrid.master.entity.MachineModel;
import com.equipgrid.master.entity.Manufacturer;
import com.equipgrid.master.service.IMachineMasterService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/masters")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(
    name = "Machine Master Data",
    description = "Equipment types, manufacturers (OEM), machine models and billing unit masters")
public class MachineMasterController {

  private final IMachineMasterService machineMasterService;

  // ==================== EQUIPMENT TYPES ====================

  @GetMapping("/types")
  @Operation(summary = "Get all equipment types")
  public ResponseEntity<ApiResponse<List<EquipmentType>>> getTypes(
      @RequestParam(required = false, defaultValue = "false") Boolean includeInactive,
      @RequestParam(required = false) AssetCategory category) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            "Equipment types fetched",
            machineMasterService.getAllEquipmentTypes(includeInactive, category)));
  }

  @GetMapping("/types/{id}")
  @Operation(summary = "Get equipment type by ID")
  public ResponseEntity<ApiResponse<EquipmentType>> getTypeById(@PathVariable Long id) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            "Equipment type fetched", machineMasterService.getEquipmentTypeById(id)));
  }

  @PostMapping("/types")
  @Operation(summary = "Create equipment type (category required, fuzzy duplicate check)")
  public ResponseEntity<ApiResponse<EquipmentType>> createType(
      @Valid @RequestBody EquipmentTypeRequest request) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            "Equipment type created", machineMasterService.createEquipmentType(request)));
  }

  @PutMapping("/types/{id}")
  @Operation(summary = "Update equipment type")
  public ResponseEntity<ApiResponse<EquipmentType>> updateType(
      @PathVariable Long id, @Valid @RequestBody EquipmentTypeRequest request) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            "Equipment type updated", machineMasterService.updateEquipmentType(id, request)));
  }

  @DeleteMapping("/types/{id}")
  @Operation(summary = "Delete equipment type (Restricted to ROOT; Admins cannot delete)")
  public ResponseEntity<ApiResponse<Void>> deleteType(
      @PathVariable Long id, @AuthenticationPrincipal User caller) {
    machineMasterService.deleteEquipmentType(id, caller);
    return ResponseEntity.ok(ApiResponse.buildSuccess("EG-200", "Equipment type deleted", null));
  }

  @GetMapping("/types/check-availability")
  @Operation(summary = "Check equipment type name availability with fuzzy duplicate detection")
  public ResponseEntity<ApiResponse<FuzzyCheckResponse>> checkTypeAvailability(
      @RequestParam String name, @RequestParam(required = false) Long excludeId) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            machineMasterService.checkEquipmentTypeAvailability(name, excludeId)));
  }

  // ==================== MANUFACTURERS (OEM) ====================

  @GetMapping({"/manufacturers", "/oems"})
  @Operation(summary = "Get all manufacturers (OEMs)")
  public ResponseEntity<ApiResponse<List<Manufacturer>>> getManufacturers(
      @RequestParam(required = false, defaultValue = "false") Boolean includeInactive) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            "Manufacturers fetched", machineMasterService.getAllManufacturers(includeInactive)));
  }

  @GetMapping("/manufacturers/{id}")
  @Operation(summary = "Get manufacturer by ID")
  public ResponseEntity<ApiResponse<Manufacturer>> getManufacturerById(@PathVariable Long id) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            "Manufacturer fetched", machineMasterService.getManufacturerById(id)));
  }

  @PostMapping("/manufacturers")
  @Operation(summary = "Create manufacturer (name, code, country required, fuzzy duplicate check)")
  public ResponseEntity<ApiResponse<Manufacturer>> createManufacturer(
      @Valid @RequestBody ManufacturerRequest request) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            "Manufacturer created", machineMasterService.createManufacturer(request)));
  }

  @PutMapping("/manufacturers/{id}")
  @Operation(summary = "Update manufacturer")
  public ResponseEntity<ApiResponse<Manufacturer>> updateManufacturer(
      @PathVariable Long id, @Valid @RequestBody ManufacturerRequest request) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            "Manufacturer updated", machineMasterService.updateManufacturer(id, request)));
  }

  @DeleteMapping("/manufacturers/{id}")
  @Operation(summary = "Delete manufacturer (Restricted to ROOT; Admins cannot delete)")
  public ResponseEntity<ApiResponse<Void>> deleteManufacturer(
      @PathVariable Long id, @AuthenticationPrincipal User caller) {
    machineMasterService.deleteManufacturer(id, caller);
    return ResponseEntity.ok(ApiResponse.buildSuccess("EG-200", "Manufacturer deleted", null));
  }

  @GetMapping("/manufacturers/check-availability")
  @Operation(summary = "Check manufacturer name availability with fuzzy duplicate detection")
  public ResponseEntity<ApiResponse<FuzzyCheckResponse>> checkManufacturerAvailability(
      @RequestParam String name, @RequestParam(required = false) Long excludeId) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            machineMasterService.checkManufacturerAvailability(name, excludeId)));
  }

  // ==================== MACHINE MODELS ====================

  @GetMapping("/models")
  @Operation(summary = "Get machine models filtered by type and/or manufacturer")
  public ResponseEntity<ApiResponse<List<MachineModel>>> getModels(
      @RequestParam(required = false) Long typeId,
      @RequestParam(required = false) Long manufacturerId,
      @RequestParam(required = false, defaultValue = "false") Boolean includeInactive) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            "Machine models fetched",
            machineMasterService.getMachineModels(typeId, manufacturerId, includeInactive)));
  }

  @GetMapping("/models/{id}")
  @Operation(summary = "Get machine model by ID")
  public ResponseEntity<ApiResponse<MachineModel>> getModelById(@PathVariable Long id) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            "Machine model fetched", machineMasterService.getMachineModelById(id)));
  }

  @PostMapping("/models")
  @Operation(
      summary = "Create machine model (typeId & manufacturerId required, fuzzy duplicate check)")
  public ResponseEntity<ApiResponse<MachineModel>> createModel(
      @Valid @RequestBody ModelRequest request) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            "Machine model created", machineMasterService.createMachineModel(request)));
  }

  @PutMapping("/models/{id}")
  @Operation(summary = "Update machine model")
  public ResponseEntity<ApiResponse<MachineModel>> updateModel(
      @PathVariable Long id, @Valid @RequestBody ModelRequest request) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            "Machine model updated", machineMasterService.updateMachineModel(id, request)));
  }

  @DeleteMapping("/models/{id}")
  @Operation(summary = "Delete machine model (Restricted to ROOT; Admins cannot delete)")
  public ResponseEntity<ApiResponse<Void>> deleteModel(
      @PathVariable Long id, @AuthenticationPrincipal User caller) {
    machineMasterService.deleteMachineModel(id, caller);
    return ResponseEntity.ok(ApiResponse.buildSuccess("EG-200", "Machine model deleted", null));
  }

  @GetMapping("/models/check-availability")
  @Operation(summary = "Check machine model availability with fuzzy duplicate detection")
  public ResponseEntity<ApiResponse<FuzzyCheckResponse>> checkModelAvailability(
      @RequestParam String name,
      @RequestParam(required = false) Long typeId,
      @RequestParam(required = false) Long manufacturerId,
      @RequestParam(required = false) Long excludeId) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            machineMasterService.checkMachineModelAvailability(
                name, typeId, manufacturerId, excludeId)));
  }

  // ==================== BILLING UNITS ====================

  @GetMapping("/billing-units")
  @Operation(summary = "Get all active billing unit masters")
  public ResponseEntity<ApiResponse<List<BillingUnitMaster>>> getBillingUnits() {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            "Billing units fetched", machineMasterService.getAllBillingUnits()));
  }

  @PostMapping("/billing-units")
  @Operation(summary = "Create billing unit master")
  public ResponseEntity<ApiResponse<BillingUnitMaster>> createBillingUnit(
      @Valid @RequestBody BillingUnitMaster unit) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            "Billing unit created", machineMasterService.createBillingUnit(unit)));
  }
}
