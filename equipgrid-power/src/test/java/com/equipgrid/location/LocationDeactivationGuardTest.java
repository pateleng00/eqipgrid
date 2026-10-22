package com.equipgrid.location;

import static org.junit.jupiter.api.Assertions.*;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.asset.enums.AssetStatus;
import com.equipgrid.asset.repository.AssetRepository;
import com.equipgrid.common.Exceptions.BusinessRuleViolationException;
import com.equipgrid.location.entity.City;
import com.equipgrid.location.entity.Hub;
import com.equipgrid.location.entity.State;
import com.equipgrid.location.repository.CityRepository;
import com.equipgrid.location.repository.HubRepository;
import com.equipgrid.location.repository.StateRepository;
import com.equipgrid.location.service.ILocationService;
import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class LocationDeactivationGuardTest {

  @Autowired private ILocationService locationService;
  @Autowired private StateRepository stateRepository;
  @Autowired private CityRepository cityRepository;
  @Autowired private HubRepository hubRepository;
  @Autowired private AssetRepository assetRepository;

  private State testState;
  private City testCity;
  private Hub testHub;
  private Asset testAsset;

  @BeforeEach
  void setUp() {
    testState =
        stateRepository.save(
            State.builder()
                .name("Madhya Pradesh Test " + System.currentTimeMillis())
                .code("S" + (System.currentTimeMillis() % 100000000L))
                .active(true)
                .build());

    testCity =
        cityRepository.save(
            City.builder()
                .state(testState)
                .name("Bhopal Test " + System.currentTimeMillis())
                .active(true)
                .build());

    testHub =
        hubRepository.save(
            Hub.builder()
                .city(testCity)
                .name("Bhopal Central Hub")
                .code("BHP_HUB_" + System.currentTimeMillis())
                .address("Industrial Yard 1")
                .latitude(new BigDecimal("23.2599"))
                .longitude(new BigDecimal("77.4126"))
                .active(true)
                .build());

    testAsset =
        assetRepository.save(
            Asset.builder()
                .assetTag("TST-ROT-" + System.currentTimeMillis())
                .name("Test Rotavator")
                .category(AssetCategory.AGRICULTURE)
                .status(AssetStatus.AVAILABLE)
                .hub(testHub)
                .build());
  }

  @Test
  @DisplayName("Hub deactivation must be barred when active machines exist in the hub")
  void testHubDeactivationBarredWithActiveMachines() {
    BusinessRuleViolationException ex =
        assertThrows(
            BusinessRuleViolationException.class,
            () -> locationService.updateHubStatus(testHub.getId(), false));

    assertTrue(ex.getMessage().contains("Cannot deactivate Hub"));
    assertTrue(ex.getMessage().contains("active machine(s) are currently stationed in this yard"));
  }

  @Test
  @DisplayName("City deactivation must be barred when active machines exist in its hubs")
  void testCityDeactivationBarredWithActiveMachines() {
    BusinessRuleViolationException ex =
        assertThrows(
            BusinessRuleViolationException.class,
            () -> locationService.updateCityStatus(testCity.getId(), false));

    assertTrue(ex.getMessage().contains("Cannot deactivate City"));
    assertTrue(
        ex.getMessage().contains("active machine(s) currently exist in hubs under this city"));
  }

  @Test
  @DisplayName("State deactivation must be barred when active machines exist in its hubs")
  void testStateDeactivationBarredWithActiveMachines() {
    BusinessRuleViolationException ex =
        assertThrows(
            BusinessRuleViolationException.class,
            () -> locationService.updateStateStatus(testState.getId(), false));

    assertTrue(ex.getMessage().contains("Cannot deactivate State"));
    assertTrue(
        ex.getMessage().contains("active machine(s) currently exist across hubs in this state"));
  }

  @Test
  @DisplayName("Deactivation succeeds once machines are retired or reassigned")
  void testDeactivationAllowedWhenMachinesRetired() {
    // Retire the active machine
    testAsset.setStatus(AssetStatus.RETIRED);
    assetRepository.save(testAsset);

    // Now hub deactivation should succeed
    Hub deactivatedHub = locationService.updateHubStatus(testHub.getId(), false);
    assertFalse(deactivatedHub.getActive());

    // City deactivation should succeed
    City deactivatedCity = locationService.updateCityStatus(testCity.getId(), false);
    assertFalse(deactivatedCity.getActive());

    // State deactivation should succeed
    State deactivatedState = locationService.updateStateStatus(testState.getId(), false);
    assertFalse(deactivatedState.getActive());
  }
}
