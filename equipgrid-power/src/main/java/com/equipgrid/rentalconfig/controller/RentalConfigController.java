package com.equipgrid.rentalconfig.controller;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.repository.AssetRepository;
import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.common.dto.rest.MessageApiResponse;
import com.equipgrid.location.entity.Hub;
import com.equipgrid.location.repository.HubRepository;
import com.equipgrid.master.entity.EquipmentType;
import com.equipgrid.master.repository.EquipmentTypeRepository;
import com.equipgrid.rentalconfig.entity.RentalConfiguration;
import com.equipgrid.rentalconfig.repository.RentalConfigurationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/rental-configs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RentalConfigController {

    private final RentalConfigurationRepository rentalConfigurationRepository;
    private final HubRepository hubRepository;
    private final AssetRepository assetRepository;
    private final EquipmentTypeRepository equipmentTypeRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<RentalConfiguration>>> getRentalConfigs(
            @RequestParam(required = false) Long hubId,
            @RequestParam(required = false) Long assetId) {
        List<RentalConfiguration> configs;
        if (hubId != null) {
            configs = rentalConfigurationRepository.findByHubIdAndActiveTrue(hubId);
        } else if (assetId != null) {
            configs = rentalConfigurationRepository.findByAssetIdAndActiveTrue(assetId);
        } else {
            configs = rentalConfigurationRepository.findByActiveTrueOrderByIdDesc();
        }
        return ResponseEntity.ok(new ApiResponse<>(true, new MessageApiResponse("Rental configurations fetched"), configs, null));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RentalConfiguration>> createRentalConfig(@RequestBody CreateRentalConfigRequest request) {
        Hub hub = hubRepository.findById(request.hubId())
                .orElseThrow(() -> new IllegalArgumentException("Hub not found: " + request.hubId()));
        Asset asset = request.assetId() != null
                ? assetRepository.findById(request.assetId()).orElse(null)
                : null;
        EquipmentType type = request.typeId() != null
                ? equipmentTypeRepository.findById(request.typeId()).orElse(null)
                : null;

        RentalConfiguration config = RentalConfiguration.builder()
                .hub(hub)
                .asset(asset)
                .type(type)
                .baseDailyRate(request.baseDailyRate())
                .depositAmount(request.depositAmount())
                .operatorDailyRate(request.operatorDailyRate() != null ? request.operatorDailyRate() : new BigDecimal("500.00"))
                .freeDeliveryDistanceKm(request.freeDeliveryDistanceKm() != null ? request.freeDeliveryDistanceKm() : new BigDecimal("5.00"))
                .ratePerKmAfterFree(request.ratePerKmAfterFree() != null ? request.ratePerKmAfterFree() : new BigDecimal("10.00"))
                .notes(request.notes())
                .active(true)
                .build();

        RentalConfiguration saved = rentalConfigurationRepository.save(config);
        return ResponseEntity.ok(new ApiResponse<>(true, new MessageApiResponse("Rental configuration created"), saved, null));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RentalConfiguration>> updateRentalConfig(
            @PathVariable Long id,
            @RequestBody UpdateRentalConfigRequest request) {
        RentalConfiguration config = rentalConfigurationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Rental configuration not found: " + id));

        if (request.baseDailyRate() != null) config.setBaseDailyRate(request.baseDailyRate());
        if (request.depositAmount() != null) config.setDepositAmount(request.depositAmount());
        if (request.operatorDailyRate() != null) config.setOperatorDailyRate(request.operatorDailyRate());
        if (request.freeDeliveryDistanceKm() != null) config.setFreeDeliveryDistanceKm(request.freeDeliveryDistanceKm());
        if (request.ratePerKmAfterFree() != null) config.setRatePerKmAfterFree(request.ratePerKmAfterFree());
        if (request.notes() != null) config.setNotes(request.notes());

        RentalConfiguration saved = rentalConfigurationRepository.save(config);
        return ResponseEntity.ok(new ApiResponse<>(true, new MessageApiResponse("Rental configuration updated"), saved, null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> removeRentalConfig(@PathVariable Long id) {
        RentalConfiguration config = rentalConfigurationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Rental configuration not found: " + id));
        config.setActive(false);
        rentalConfigurationRepository.save(config);
        return ResponseEntity.ok(new ApiResponse<>(true, new MessageApiResponse("Rental configuration removed"), null, null));
    }

    public record CreateRentalConfigRequest(
            Long hubId,
            Long assetId,
            Long typeId,
            BigDecimal baseDailyRate,
            BigDecimal depositAmount,
            BigDecimal operatorDailyRate,
            BigDecimal freeDeliveryDistanceKm,
            BigDecimal ratePerKmAfterFree,
            String notes
    ) {}

    public record UpdateRentalConfigRequest(
            BigDecimal baseDailyRate,
            BigDecimal depositAmount,
            BigDecimal operatorDailyRate,
            BigDecimal freeDeliveryDistanceKm,
            BigDecimal ratePerKmAfterFree,
            String notes
    ) {}
}
