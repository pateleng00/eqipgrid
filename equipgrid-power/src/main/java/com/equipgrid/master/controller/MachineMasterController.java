package com.equipgrid.master.controller;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.master.dto.request.ModelRequest;
import com.equipgrid.master.entity.BillingUnitMaster;
import com.equipgrid.master.entity.EquipmentType;
import com.equipgrid.master.entity.MachineModel;
import com.equipgrid.master.entity.Manufacturer;
import com.equipgrid.master.service.IMachineMasterService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/masters")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Machine Master Data", description = "Equipment types, manufacturers, machine models and billing unit masters")
public class MachineMasterController {

    private final IMachineMasterService machineMasterService;

    @GetMapping("/types")
    @Operation(summary = "Get all active equipment types")
    public ResponseEntity<ApiResponse<List<EquipmentType>>> getTypes() {
        return ResponseEntity.ok(ApiResponse.buildSuccess("Equipment types fetched", machineMasterService.getAllEquipmentTypes()));
    }

    @PostMapping("/types")
    @Operation(summary = "Create equipment type")
    public ResponseEntity<ApiResponse<EquipmentType>> createType(@Valid @RequestBody EquipmentType type) {
        return ResponseEntity.ok(ApiResponse.buildSuccess("Equipment type created", machineMasterService.createEquipmentType(type)));
    }

    @GetMapping("/manufacturers")
    @Operation(summary = "Get all active manufacturers")
    public ResponseEntity<ApiResponse<List<Manufacturer>>> getManufacturers() {
        return ResponseEntity.ok(ApiResponse.buildSuccess("Manufacturers fetched", machineMasterService.getAllManufacturers()));
    }

    @PostMapping("/manufacturers")
    @Operation(summary = "Create manufacturer")
    public ResponseEntity<ApiResponse<Manufacturer>> createManufacturer(@Valid @RequestBody Manufacturer manufacturer) {
        return ResponseEntity.ok(ApiResponse.buildSuccess("Manufacturer created", machineMasterService.createManufacturer(manufacturer)));
    }

    @GetMapping("/models")
    @Operation(summary = "Get machine models filtered by type and/or manufacturer")
    public ResponseEntity<ApiResponse<List<MachineModel>>> getModels(
            @RequestParam(required = false) Long typeId,
            @RequestParam(required = false) Long manufacturerId) {
        return ResponseEntity.ok(ApiResponse.buildSuccess("Machine models fetched", machineMasterService.getMachineModels(typeId, manufacturerId)));
    }

    @PostMapping("/models")
    @Operation(summary = "Create machine model")
    public ResponseEntity<ApiResponse<MachineModel>> createModel(@Valid @RequestBody ModelRequest request) {
        return ResponseEntity.ok(ApiResponse.buildSuccess("Machine model created", machineMasterService.createMachineModel(request)));
    }

    @GetMapping("/billing-units")
    @Operation(summary = "Get all active billing unit masters")
    public ResponseEntity<ApiResponse<List<BillingUnitMaster>>> getBillingUnits() {
        return ResponseEntity.ok(ApiResponse.buildSuccess("Billing units fetched", machineMasterService.getAllBillingUnits()));
    }

    @PostMapping("/billing-units")
    @Operation(summary = "Create billing unit master")
    public ResponseEntity<ApiResponse<BillingUnitMaster>> createBillingUnit(@Valid @RequestBody BillingUnitMaster unit) {
        return ResponseEntity.ok(ApiResponse.buildSuccess("Billing unit created", machineMasterService.createBillingUnit(unit)));
    }
}
