package com.equipgrid.master.controller;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.common.dto.rest.MessageApiResponse;
import com.equipgrid.master.entity.EquipmentType;
import com.equipgrid.master.entity.MachineModel;
import com.equipgrid.master.entity.Manufacturer;
import com.equipgrid.master.repository.EquipmentTypeRepository;
import com.equipgrid.master.repository.MachineModelRepository;
import com.equipgrid.master.repository.ManufacturerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/masters")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MachineMasterController {

    private final EquipmentTypeRepository equipmentTypeRepository;
    private final ManufacturerRepository manufacturerRepository;
    private final MachineModelRepository machineModelRepository;

    @GetMapping("/types")
    public ResponseEntity<ApiResponse<List<EquipmentType>>> getTypes() {
        List<EquipmentType> types = equipmentTypeRepository.findByActiveTrueOrderByNameAsc();
        return ResponseEntity.ok(new ApiResponse<>(true, new MessageApiResponse("Equipment types fetched"), types, null));
    }

    @PostMapping("/types")
    public ResponseEntity<ApiResponse<EquipmentType>> createType(@RequestBody EquipmentType type) {
        EquipmentType saved = equipmentTypeRepository.save(type);
        return ResponseEntity.ok(new ApiResponse<>(true, new MessageApiResponse("Equipment type created"), saved, null));
    }

    @GetMapping("/manufacturers")
    public ResponseEntity<ApiResponse<List<Manufacturer>>> getManufacturers() {
        List<Manufacturer> manufacturers = manufacturerRepository.findByActiveTrueOrderByNameAsc();
        return ResponseEntity.ok(new ApiResponse<>(true, new MessageApiResponse("Manufacturers fetched"), manufacturers, null));
    }

    @PostMapping("/manufacturers")
    public ResponseEntity<ApiResponse<Manufacturer>> createManufacturer(@RequestBody Manufacturer manufacturer) {
        Manufacturer saved = manufacturerRepository.save(manufacturer);
        return ResponseEntity.ok(new ApiResponse<>(true, new MessageApiResponse("Manufacturer created"), saved, null));
    }

    @GetMapping("/models")
    public ResponseEntity<ApiResponse<List<MachineModel>>> getModels(
            @RequestParam(required = false) Long typeId,
            @RequestParam(required = false) Long manufacturerId) {
        List<MachineModel> models;
        if (typeId != null && manufacturerId != null) {
            models = machineModelRepository.findByTypeIdAndManufacturerIdAndActiveTrueOrderByNameAsc(typeId, manufacturerId);
        } else if (typeId != null) {
            models = machineModelRepository.findByTypeIdAndActiveTrueOrderByNameAsc(typeId);
        } else if (manufacturerId != null) {
            models = machineModelRepository.findByManufacturerIdAndActiveTrueOrderByNameAsc(manufacturerId);
        } else {
            models = machineModelRepository.findByActiveTrueOrderByNameAsc();
        }
        return ResponseEntity.ok(new ApiResponse<>(true, new MessageApiResponse("Machine models fetched"), models, null));
    }

    @PostMapping("/models")
    public ResponseEntity<ApiResponse<MachineModel>> createModel(@RequestBody ModelRequest request) {
        EquipmentType type = equipmentTypeRepository.findById(request.typeId())
                .orElseThrow(() -> new IllegalArgumentException("Type not found: " + request.typeId()));
        Manufacturer manufacturer = manufacturerRepository.findById(request.manufacturerId())
                .orElseThrow(() -> new IllegalArgumentException("Manufacturer not found: " + request.manufacturerId()));

        MachineModel model = MachineModel.builder()
                .type(type)
                .manufacturer(manufacturer)
                .name(request.name())
                .modelNumber(request.modelNumber())
                .specs(request.specs())
                .active(true)
                .build();
        MachineModel saved = machineModelRepository.save(model);
        return ResponseEntity.ok(new ApiResponse<>(true, new MessageApiResponse("Machine model created"), saved, null));
    }

    public record ModelRequest(Long typeId, Long manufacturerId, String name, String modelNumber, String specs) {}
}
