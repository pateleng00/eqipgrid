package com.equipgrid.master.service;

import com.equipgrid.asset.repository.AssetRepository;
import com.equipgrid.auth.entity.User;
import com.equipgrid.auth.enums.Role;
import com.equipgrid.common.Exceptions;
import com.equipgrid.master.dto.request.EquipmentTypeRequest;
import com.equipgrid.master.dto.request.ManufacturerRequest;
import com.equipgrid.master.dto.request.ModelRequest;
import com.equipgrid.master.dto.response.FuzzyCheckResponse;
import com.equipgrid.master.entity.BillingUnitMaster;
import com.equipgrid.master.entity.EquipmentType;
import com.equipgrid.master.entity.MachineModel;
import com.equipgrid.master.entity.Manufacturer;
import com.equipgrid.master.repository.BillingUnitMasterRepository;
import com.equipgrid.master.repository.EquipmentTypeRepository;
import com.equipgrid.master.repository.MachineModelRepository;
import com.equipgrid.master.repository.ManufacturerRepository;
import com.equipgrid.master.util.FuzzyMatchUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class MachineMasterServiceImpl implements IMachineMasterService {

    private final EquipmentTypeRepository equipmentTypeRepository;
    private final ManufacturerRepository manufacturerRepository;
    private final MachineModelRepository machineModelRepository;
    private final BillingUnitMasterRepository billingUnitMasterRepository;
    private final AssetRepository assetRepository;

    // ==================== EQUIPMENT TYPES ====================

    @Override
    @Transactional(readOnly = true)
    public List<EquipmentType> getAllEquipmentTypes(Boolean includeInactive) {
        if (Boolean.TRUE.equals(includeInactive)) {
            return equipmentTypeRepository.findAllByOrderByNameAsc();
        }
        return equipmentTypeRepository.findByActiveTrueOrderByNameAsc();
    }

    @Override
    @Transactional(readOnly = true)
    public EquipmentType getEquipmentTypeById(Long id) {
        return equipmentTypeRepository.findById(id)
                .orElseThrow(() -> new Exceptions.ResourceNotFoundException("Equipment type not found with ID: " + id));
    }

    @Override
    public EquipmentType createEquipmentType(EquipmentTypeRequest request) {
        // 1. Fuzzy match check to avoid duplicacy
        FuzzyCheckResponse fuzzyCheck = checkEquipmentTypeAvailability(request.getName(), null);
        if (fuzzyCheck.isDuplicate()) {
            throw new Exceptions.DuplicateResourceException(fuzzyCheck.getMessage());
        }

        // 2. Generate or sanitize code
        String code = request.getCode() != null && !request.getCode().isBlank()
                ? request.getCode().trim().toUpperCase()
                : generateCode("TYPE-", request.getName());

        if (equipmentTypeRepository.existsByCodeIgnoreCase(code)) {
            code = code + "-" + (System.currentTimeMillis() % 1000);
        }

        EquipmentType type = EquipmentType.builder()
                .name(request.getName().trim())
                .code(code)
                .category(request.getCategory())
                .description(request.getDescription())
                .hindiName(request.getHindiName())
                .localLanguageName(request.getLocalLanguageName())
                .hindiDescription(request.getHindiDescription())
                .active(request.getActive() != null ? request.getActive() : true)
                .build();

        EquipmentType saved = equipmentTypeRepository.save(type);
        log.info("Created Equipment Type: {} (Code: {}, Category: {})", saved.getName(), saved.getCode(), saved.getCategory());
        return saved;
    }

    @Override
    public EquipmentType updateEquipmentType(Long id, EquipmentTypeRequest request) {
        EquipmentType existing = getEquipmentTypeById(id);

        // Check fuzzy match if name changed
        if (!existing.getName().trim().equalsIgnoreCase(request.getName().trim())) {
            FuzzyCheckResponse fuzzyCheck = checkEquipmentTypeAvailability(request.getName(), id);
            if (fuzzyCheck.isDuplicate()) {
                throw new Exceptions.DuplicateResourceException(fuzzyCheck.getMessage());
            }
        }

        existing.setName(request.getName().trim());
        if (request.getCode() != null && !request.getCode().isBlank()) {
            String newCode = request.getCode().trim().toUpperCase();
            if (!newCode.equalsIgnoreCase(existing.getCode()) && equipmentTypeRepository.existsByCodeIgnoreCase(newCode)) {
                throw new Exceptions.DuplicateResourceException("Equipment type code already exists: " + newCode);
            }
            existing.setCode(newCode);
        }
        if (request.getCategory() != null) {
            existing.setCategory(request.getCategory());
        }
        existing.setDescription(request.getDescription());
        existing.setHindiName(request.getHindiName());
        existing.setLocalLanguageName(request.getLocalLanguageName());
        existing.setHindiDescription(request.getHindiDescription());
        if (request.getActive() != null) {
            existing.setActive(request.getActive());
        }

        EquipmentType updated = equipmentTypeRepository.save(existing);
        log.info("Updated Equipment Type: {} (ID: {})", updated.getName(), id);
        return updated;
    }

    @Override
    public void deleteEquipmentType(Long id, User caller) {
        // Enforce role rule: Admins can add and update, but NOT delete
        if (caller != null && caller.getRole() != null && caller.getRole() != Role.ROOT) {
            throw new Exceptions.ForbiddenException(
                    "Forbidden: Admins can add and update, but are not permitted to delete master data. Only ROOT administrators can perform deletion."
            );
        }

        EquipmentType type = getEquipmentTypeById(id);

        if (assetRepository.existsByTypeId(id)) {
            throw new Exceptions.BusinessRuleViolationException(
                    "Cannot delete equipment type '" + type.getName() + "' because fleet assets are actively linked to it. Please deactivate it instead."
            );
        }
        if (machineModelRepository.existsByTypeId(id)) {
            throw new Exceptions.BusinessRuleViolationException(
                    "Cannot delete equipment type '" + type.getName() + "' because machine models are linked to it. Please reassign or delete models first, or deactivate this type."
            );
        }

        equipmentTypeRepository.delete(type);
        log.info("Deleted Equipment Type: {} (ID: {}) by {}", type.getName(), id, caller != null ? caller.getUsername() : "ROOT");
    }

    @Override
    @Transactional(readOnly = true)
    public FuzzyCheckResponse checkEquipmentTypeAvailability(String name, Long excludeId) {
        List<FuzzyMatchUtil.MatchCandidate> candidates = equipmentTypeRepository.findAll().stream()
                .map(t -> new FuzzyMatchUtil.MatchCandidate(t.getId(), t.getName()))
                .collect(Collectors.toList());

        FuzzyMatchUtil.FuzzyResult result = FuzzyMatchUtil.findFuzzyMatch(name, candidates, excludeId, 0.80);
        return FuzzyCheckResponse.builder()
                .duplicate(result.duplicate())
                .matchedName(result.matchedName())
                .similarityPercentage(result.similarityPercentage())
                .message(result.message())
                .build();
    }

    // ==================== MANUFACTURERS (OEM) ====================

    @Override
    @Transactional(readOnly = true)
    public List<Manufacturer> getAllManufacturers(Boolean includeInactive) {
        if (Boolean.TRUE.equals(includeInactive)) {
            return manufacturerRepository.findAllByOrderByNameAsc();
        }
        return manufacturerRepository.findByActiveTrueOrderByNameAsc();
    }

    @Override
    @Transactional(readOnly = true)
    public Manufacturer getManufacturerById(Long id) {
        return manufacturerRepository.findById(id)
                .orElseThrow(() -> new Exceptions.ResourceNotFoundException("Manufacturer not found with ID: " + id));
    }

    @Override
    public Manufacturer createManufacturer(ManufacturerRequest request) {
        // 1. Fuzzy match check
        FuzzyCheckResponse fuzzyCheck = checkManufacturerAvailability(request.getName(), null);
        if (fuzzyCheck.isDuplicate()) {
            throw new Exceptions.DuplicateResourceException(fuzzyCheck.getMessage());
        }

        // 2. Check code uniqueness
        String code = request.getCode().trim().toUpperCase();
        if (manufacturerRepository.existsByCodeIgnoreCase(code)) {
            throw new Exceptions.DuplicateResourceException("Manufacturer code already exists: " + code);
        }

        Manufacturer mfg = Manufacturer.builder()
                .name(request.getName().trim())
                .code(code)
                .country(request.getCountry() != null && !request.getCountry().isBlank() ? request.getCountry().trim() : "India")
                .active(request.getActive() != null ? request.getActive() : true)
                .build();

        Manufacturer saved = manufacturerRepository.save(mfg);
        log.info("Created Manufacturer: {} (Code: {}, Country: {})", saved.getName(), saved.getCode(), saved.getCountry());
        return saved;
    }

    @Override
    public Manufacturer updateManufacturer(Long id, ManufacturerRequest request) {
        Manufacturer existing = getManufacturerById(id);

        if (!existing.getName().trim().equalsIgnoreCase(request.getName().trim())) {
            FuzzyCheckResponse fuzzyCheck = checkManufacturerAvailability(request.getName(), id);
            if (fuzzyCheck.isDuplicate()) {
                throw new Exceptions.DuplicateResourceException(fuzzyCheck.getMessage());
            }
        }

        String newCode = request.getCode().trim().toUpperCase();
        if (!newCode.equalsIgnoreCase(existing.getCode()) && manufacturerRepository.existsByCodeIgnoreCase(newCode)) {
            throw new Exceptions.DuplicateResourceException("Manufacturer code already exists: " + newCode);
        }

        existing.setName(request.getName().trim());
        existing.setCode(newCode);
        if (request.getCountry() != null && !request.getCountry().isBlank()) {
            existing.setCountry(request.getCountry().trim());
        }
        if (request.getActive() != null) {
            existing.setActive(request.getActive());
        }

        Manufacturer updated = manufacturerRepository.save(existing);
        log.info("Updated Manufacturer: {} (ID: {})", updated.getName(), id);
        return updated;
    }

    @Override
    public void deleteManufacturer(Long id, User caller) {
        // Enforce role rule: Admins can add and update, but NOT delete
        if (caller != null && caller.getRole() != null && caller.getRole() != Role.ROOT) {
            throw new Exceptions.ForbiddenException(
                    "Forbidden: Admins can add and update, but are not permitted to delete manufacturers. Only ROOT administrators can perform deletion."
            );
        }

        Manufacturer mfg = getManufacturerById(id);

        if (assetRepository.existsByManufacturerId(id)) {
            throw new Exceptions.BusinessRuleViolationException(
                    "Cannot delete manufacturer '" + mfg.getName() + "' because fleet machinery assets are actively linked to it. Please deactivate it instead."
            );
        }
        if (machineModelRepository.existsByManufacturerId(id)) {
            throw new Exceptions.BusinessRuleViolationException(
                    "Cannot delete manufacturer '" + mfg.getName() + "' because machine models are linked to it. Please reassign or delete models first, or deactivate this manufacturer."
            );
        }

        manufacturerRepository.delete(mfg);
        log.info("Deleted Manufacturer: {} (ID: {}) by {}", mfg.getName(), id, caller != null ? caller.getUsername() : "ROOT");
    }

    @Override
    @Transactional(readOnly = true)
    public FuzzyCheckResponse checkManufacturerAvailability(String name, Long excludeId) {
        List<FuzzyMatchUtil.MatchCandidate> candidates = manufacturerRepository.findAll().stream()
                .map(m -> new FuzzyMatchUtil.MatchCandidate(m.getId(), m.getName()))
                .collect(Collectors.toList());

        FuzzyMatchUtil.FuzzyResult result = FuzzyMatchUtil.findFuzzyMatch(name, candidates, excludeId, 0.80);
        return FuzzyCheckResponse.builder()
                .duplicate(result.duplicate())
                .matchedName(result.matchedName())
                .similarityPercentage(result.similarityPercentage())
                .message(result.message())
                .build();
    }

    // ==================== MACHINE MODELS ====================

    @Override
    @Transactional(readOnly = true)
    public List<MachineModel> getMachineModels(Long typeId, Long manufacturerId, Boolean includeInactive) {
        boolean activeOnly = !Boolean.TRUE.equals(includeInactive);

        if (typeId != null && manufacturerId != null) {
            return activeOnly
                    ? machineModelRepository.findByTypeIdAndManufacturerIdAndActiveTrueOrderByNameAsc(typeId, manufacturerId)
                    : machineModelRepository.findByTypeIdAndManufacturerIdOrderByNameAsc(typeId, manufacturerId);
        } else if (typeId != null) {
            return activeOnly
                    ? machineModelRepository.findByTypeIdAndActiveTrueOrderByNameAsc(typeId)
                    : machineModelRepository.findByTypeIdOrderByNameAsc(typeId);
        } else if (manufacturerId != null) {
            return activeOnly
                    ? machineModelRepository.findByManufacturerIdAndActiveTrueOrderByNameAsc(manufacturerId)
                    : machineModelRepository.findByManufacturerIdOrderByNameAsc(manufacturerId);
        } else {
            return activeOnly
                    ? machineModelRepository.findByActiveTrueOrderByNameAsc()
                    : machineModelRepository.findAllByOrderByNameAsc();
        }
    }

    @Override
    @Transactional(readOnly = true)
    public MachineModel getMachineModelById(Long id) {
        return machineModelRepository.findById(id)
                .orElseThrow(() -> new Exceptions.ResourceNotFoundException("Machine model not found with ID: " + id));
    }

    @Override
    public MachineModel createMachineModel(ModelRequest request) {
        // Equipment type and manufacturer are required
        EquipmentType type = getEquipmentTypeById(request.getTypeId());
        Manufacturer manufacturer = getManufacturerById(request.getManufacturerId());

        // Fuzzy match check across models within type/manufacturer
        FuzzyCheckResponse fuzzyCheck = checkMachineModelAvailability(request.getName(), request.getTypeId(), request.getManufacturerId(), null);
        if (fuzzyCheck.isDuplicate()) {
            throw new Exceptions.DuplicateResourceException(fuzzyCheck.getMessage());
        }

        String modelNum = request.getModelNumber() != null && !request.getModelNumber().isBlank()
                ? request.getModelNumber().trim()
                : generateModelNumber(manufacturer.getCode(), request.getName());

        MachineModel model = MachineModel.builder()
                .type(type)
                .manufacturer(manufacturer)
                .name(request.getName().trim())
                .modelNumber(modelNum)
                .specs(request.getSpecs())
                .active(request.getActive() != null ? request.getActive() : true)
                .build();

        MachineModel saved = machineModelRepository.save(model);
        log.info("Created Machine Model: {} (Model#: {}, Type: {}, OEM: {})", saved.getName(), saved.getModelNumber(), type.getName(), manufacturer.getName());
        return saved;
    }

    @Override
    public MachineModel updateMachineModel(Long id, ModelRequest request) {
        MachineModel existing = getMachineModelById(id);

        EquipmentType type = getEquipmentTypeById(request.getTypeId());
        Manufacturer manufacturer = getManufacturerById(request.getManufacturerId());

        if (!existing.getName().trim().equalsIgnoreCase(request.getName().trim())) {
            FuzzyCheckResponse fuzzyCheck = checkMachineModelAvailability(request.getName(), request.getTypeId(), request.getManufacturerId(), id);
            if (fuzzyCheck.isDuplicate()) {
                throw new Exceptions.DuplicateResourceException(fuzzyCheck.getMessage());
            }
        }

        existing.setType(type);
        existing.setManufacturer(manufacturer);
        existing.setName(request.getName().trim());
        if (request.getModelNumber() != null && !request.getModelNumber().isBlank()) {
            existing.setModelNumber(request.getModelNumber().trim());
        }
        existing.setSpecs(request.getSpecs());
        if (request.getActive() != null) {
            existing.setActive(request.getActive());
        }

        MachineModel updated = machineModelRepository.save(existing);
        log.info("Updated Machine Model: {} (ID: {})", updated.getName(), id);
        return updated;
    }

    @Override
    public void deleteMachineModel(Long id, User caller) {
        // Enforce role rule: Admins can add and update, but NOT delete
        if (caller != null && caller.getRole() != null && caller.getRole() != Role.ROOT) {
            throw new Exceptions.ForbiddenException(
                    "Forbidden: Admins can add and update, but are not permitted to delete machine models. Only ROOT administrators can perform deletion."
            );
        }

        MachineModel model = getMachineModelById(id);

        if (assetRepository.existsByModelId(id)) {
            throw new Exceptions.BusinessRuleViolationException(
                    "Cannot delete machine model '" + model.getName() + "' because fleet assets are linked to it. Please deactivate it instead."
            );
        }

        machineModelRepository.delete(model);
        log.info("Deleted Machine Model: {} (ID: {}) by {}", model.getName(), id, caller != null ? caller.getUsername() : "ROOT");
    }

    @Override
    @Transactional(readOnly = true)
    public FuzzyCheckResponse checkMachineModelAvailability(String name, Long typeId, Long manufacturerId, Long excludeId) {
        List<MachineModel> candidatesQuery;
        if (typeId != null && manufacturerId != null) {
            candidatesQuery = machineModelRepository.findByTypeIdAndManufacturerIdOrderByNameAsc(typeId, manufacturerId);
        } else if (typeId != null) {
            candidatesQuery = machineModelRepository.findByTypeIdOrderByNameAsc(typeId);
        } else if (manufacturerId != null) {
            candidatesQuery = machineModelRepository.findByManufacturerIdOrderByNameAsc(manufacturerId);
        } else {
            candidatesQuery = machineModelRepository.findAll();
        }

        List<FuzzyMatchUtil.MatchCandidate> candidates = candidatesQuery.stream()
                .map(m -> new FuzzyMatchUtil.MatchCandidate(m.getId(), m.getName()))
                .collect(Collectors.toList());

        FuzzyMatchUtil.FuzzyResult result = FuzzyMatchUtil.findFuzzyMatch(name, candidates, excludeId, 0.80);
        return FuzzyCheckResponse.builder()
                .duplicate(result.duplicate())
                .matchedName(result.matchedName())
                .similarityPercentage(result.similarityPercentage())
                .message(result.message())
                .build();
    }

    // ==================== BILLING UNITS ====================

    @Override
    @Transactional(readOnly = true)
    public List<BillingUnitMaster> getAllBillingUnits() {
        return billingUnitMasterRepository.findByActiveTrueOrderByDisplayOrderAsc();
    }

    @Override
    public BillingUnitMaster createBillingUnit(BillingUnitMaster unit) {
        if (unit.getCode() == null || unit.getCode().isBlank()) {
            throw new Exceptions.BusinessRuleViolationException("Billing unit code is required");
        }
        if (billingUnitMasterRepository.existsByCodeIgnoreCase(unit.getCode().trim())) {
            throw new Exceptions.DuplicateResourceException("Billing unit with code already exists: " + unit.getCode());
        }
        unit.setCode(unit.getCode().trim().toUpperCase());
        if (unit.getActive() == null) {
            unit.setActive(true);
        }
        return billingUnitMasterRepository.save(unit);
    }

    // ==================== HELPERS ====================

    private String generateCode(String prefix, String name) {
        String clean = name.replaceAll("[^a-zA-Z0-9]", "-").toUpperCase();
        clean = clean.replaceAll("-+", "-").replaceAll("^-|-$", "");
        if (clean.length() > 20) {
            clean = clean.substring(0, 20);
        }
        return prefix + clean;
    }

    private String generateModelNumber(String mfgCode, String modelName) {
        String cleanName = modelName.replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
        if (cleanName.length() > 8) {
            cleanName = cleanName.substring(0, 8);
        }
        return (mfgCode != null ? mfgCode.toUpperCase() : "MOD") + "-" + cleanName + "-" + (System.currentTimeMillis() % 1000);
    }
}
