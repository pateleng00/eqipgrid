package com.equipgrid.rentalconfig.service;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.enums.BillingUnit;
import com.equipgrid.asset.repository.AssetRepository;
import com.equipgrid.location.entity.Hub;
import com.equipgrid.location.repository.HubRepository;
import com.equipgrid.master.entity.EquipmentType;
import com.equipgrid.master.repository.BillingUnitMasterRepository;
import com.equipgrid.master.repository.EquipmentTypeRepository;
import com.equipgrid.rentalconfig.dto.request.CreateRentalConfigRequest;
import com.equipgrid.rentalconfig.dto.request.UpdateRentalConfigRequest;
import com.equipgrid.rentalconfig.entity.RentalConfiguration;
import com.equipgrid.rentalconfig.repository.RentalConfigurationQueryRepository;
import com.equipgrid.rentalconfig.repository.RentalConfigurationRepository;
import java.math.BigDecimal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class RentalConfigServiceImpl implements IRentalConfigService {

  private final RentalConfigurationRepository rentalConfigurationRepository;
  private final RentalConfigurationQueryRepository rentalConfigurationQueryRepository;
  private final HubRepository hubRepository;
  private final AssetRepository assetRepository;
  private final EquipmentTypeRepository equipmentTypeRepository;
  private final BillingUnitMasterRepository billingUnitMasterRepository;

  @Override
  @Transactional(readOnly = true)
  public List<RentalConfiguration> getRentalConfigs(Long hubId, Long assetId) {
    return rentalConfigurationQueryRepository.fetchRentalConfigs(hubId, assetId);
  }

  @Override
  public RentalConfiguration createRentalConfig(CreateRentalConfigRequest request) {
    Hub hub =
        hubRepository
            .findById(request.getHubId())
            .orElseThrow(
                () -> new IllegalArgumentException("Hub not found: " + request.getHubId()));
    Asset asset =
        request.getAssetId() != null
            ? assetRepository.findById(request.getAssetId()).orElse(null)
            : null;
    EquipmentType type =
        request.getTypeId() != null
            ? equipmentTypeRepository.findById(request.getTypeId()).orElse(null)
            : null;

    RentalConfiguration config =
        RentalConfiguration.builder()
            .hub(hub)
            .asset(asset)
            .type(type)
            .baseDailyRate(request.getBaseDailyRate())
            .depositAmount(request.getDepositAmount())
            .operatorDailyRate(
                request.getOperatorDailyRate() != null
                    ? request.getOperatorDailyRate()
                    : BigDecimal.ZERO)
            .freeDeliveryDistanceKm(
                request.getFreeDeliveryDistanceKm() != null
                    ? request.getFreeDeliveryDistanceKm()
                    : BigDecimal.ZERO)
            .ratePerKmAfterFree(
                request.getRatePerKmAfterFree() != null
                    ? request.getRatePerKmAfterFree()
                    : BigDecimal.ZERO)
            .billingUnit(
                request.getBillingUnit() != null ? request.getBillingUnit() : BillingUnit.DAILY)
            .workingHoursLimit(request.getWorkingHoursLimit())
            .shiftTerms(request.getShiftTerms())
            .notes(request.getNotes())
            .active(true)
            .build();

    if (request.getBillingUnitId() != null) {
      billingUnitMasterRepository
          .findById(request.getBillingUnitId())
          .ifPresent(
              bu -> {
                config.setBillingUnitMaster(bu);
                config.setBillingUnit(BillingUnit.fromValue(bu.getCode()));
                if (config.getShiftTerms() == null || config.getShiftTerms().isBlank()) {
                  config.setShiftTerms(bu.getDefaultShiftTerms());
                }
              });
    }

    return rentalConfigurationRepository.save(config);
  }

  @Override
  public RentalConfiguration updateRentalConfig(Long id, UpdateRentalConfigRequest request) {
    RentalConfiguration config =
        rentalConfigurationRepository
            .findById(id)
            .orElseThrow(
                () -> new IllegalArgumentException("Rental configuration not found: " + id));

    if (request.getBaseDailyRate() != null) config.setBaseDailyRate(request.getBaseDailyRate());
    if (request.getDepositAmount() != null) config.setDepositAmount(request.getDepositAmount());
    if (request.getOperatorDailyRate() != null)
      config.setOperatorDailyRate(request.getOperatorDailyRate());
    if (request.getFreeDeliveryDistanceKm() != null)
      config.setFreeDeliveryDistanceKm(request.getFreeDeliveryDistanceKm());
    if (request.getRatePerKmAfterFree() != null)
      config.setRatePerKmAfterFree(request.getRatePerKmAfterFree());
    if (request.getBillingUnitId() != null) {
      billingUnitMasterRepository
          .findById(request.getBillingUnitId())
          .ifPresent(
              bu -> {
                config.setBillingUnitMaster(bu);
                config.setBillingUnit(BillingUnit.fromValue(bu.getCode()));
                if (request.getShiftTerms() == null && bu.getDefaultShiftTerms() != null) {
                  config.setShiftTerms(bu.getDefaultShiftTerms());
                }
              });
    } else if (request.getBillingUnit() != null) {
      config.setBillingUnit(request.getBillingUnit());
    }
    if (request.getWorkingHoursLimit() != null)
      config.setWorkingHoursLimit(request.getWorkingHoursLimit());
    if (request.getShiftTerms() != null) config.setShiftTerms(request.getShiftTerms());
    if (request.getNotes() != null) config.setNotes(request.getNotes());

    return rentalConfigurationRepository.save(config);
  }

  @Override
  public void deleteRentalConfig(Long id) {
    RentalConfiguration config =
        rentalConfigurationRepository
            .findById(id)
            .orElseThrow(
                () -> new IllegalArgumentException("Rental configuration not found: " + id));
    config.setActive(false);
    rentalConfigurationRepository.save(config);
  }
}
