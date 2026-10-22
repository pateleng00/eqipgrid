package com.equipgrid.location.service;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.common.Exceptions;
import com.equipgrid.common.config.CacheConfig;
import com.equipgrid.location.dto.request.CityRequest;
import com.equipgrid.location.dto.request.HubRequest;
import com.equipgrid.location.dto.response.CityHierarchyResponse;
import com.equipgrid.location.dto.response.HubHierarchyResponse;
import com.equipgrid.location.dto.response.HubMachineResponse;
import com.equipgrid.location.dto.response.StateHierarchyResponse;
import com.equipgrid.location.entity.City;
import com.equipgrid.location.entity.Hub;
import com.equipgrid.location.entity.State;
import com.equipgrid.location.repository.CityRepository;
import com.equipgrid.location.repository.HubRepository;
import com.equipgrid.location.repository.LocationQueryRepository;
import com.equipgrid.location.repository.StateRepository;
import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class LocationServiceImpl implements ILocationService {

  private final StateRepository stateRepository;
  private final CityRepository cityRepository;
  private final HubRepository hubRepository;
  private final LocationQueryRepository locationQueryRepository;

  @Override
  @Transactional(readOnly = true)
  @Cacheable(value = CacheConfig.CACHE_STATES)
  public List<State> getStates() {
    return getStates(false);
  }

  @Override
  @Transactional(readOnly = true)
  public List<State> getStates(boolean includeInactive) {
    return includeInactive
        ? locationQueryRepository.findAllStates()
        : locationQueryRepository.findActiveStates();
  }

  @Override
  @Caching(
      evict = {
        @CacheEvict(value = CacheConfig.CACHE_STATES, allEntries = true),
        @CacheEvict(value = CacheConfig.CACHE_CITIES, allEntries = true),
        @CacheEvict(value = CacheConfig.CACHE_HUBS, allEntries = true),
        @CacheEvict(value = CacheConfig.CACHE_LOCATION_HIERARCHY, allEntries = true)
      })
  public State createState(State state) {
    return stateRepository.save(state);
  }

  @Override
  @Transactional(readOnly = true)
  @Cacheable(value = CacheConfig.CACHE_CITIES, key = "'state-' + #stateId")
  public List<City> getCitiesByState(Long stateId) {
    return locationQueryRepository.findActiveCitiesByStateId(stateId);
  }

  @Override
  @Transactional(readOnly = true)
  @Cacheable(value = CacheConfig.CACHE_CITIES, key = "'all'")
  public List<City> getAllCities() {
    return getAllCities(false);
  }

  @Override
  @Transactional(readOnly = true)
  public List<City> getAllCities(boolean includeInactive) {
    return includeInactive
        ? locationQueryRepository.findAllCities()
        : locationQueryRepository.findAllActiveCities();
  }

  @Override
  @Caching(
      evict = {
        @CacheEvict(value = CacheConfig.CACHE_CITIES, allEntries = true),
        @CacheEvict(value = CacheConfig.CACHE_HUBS, allEntries = true),
        @CacheEvict(value = CacheConfig.CACHE_LOCATION_HIERARCHY, allEntries = true)
      })
  public City createCity(CityRequest request) {
    State state =
        stateRepository
            .findById(request.getStateId())
            .orElseThrow(
                () -> new IllegalArgumentException("State not found: " + request.getStateId()));
    City city =
        City.builder()
            .state(state)
            .name(request.getName())
            .hindiName(request.getHindiName())
            .pinCode(request.getPinCode())
            .active(true)
            .build();
    return cityRepository.save(city);
  }

  @Override
  @Transactional(readOnly = true)
  @Cacheable(value = CacheConfig.CACHE_HUBS, key = "'city-' + #cityId")
  public List<Hub> getHubsByCity(Long cityId) {
    return locationQueryRepository.findActiveHubsByCityId(cityId);
  }

  @Override
  @Transactional(readOnly = true)
  @Cacheable(value = CacheConfig.CACHE_HUBS, key = "'all'")
  public List<Hub> getAllHubs() {
    return getAllHubs(false);
  }

  @Override
  @Transactional(readOnly = true)
  public List<Hub> getAllHubs(boolean includeInactive) {
    return includeInactive
        ? locationQueryRepository.findAllHubs()
        : locationQueryRepository.findAllActiveHubs();
  }

  @Override
  @Caching(
      evict = {
        @CacheEvict(value = CacheConfig.CACHE_LOCATION_HIERARCHY, allEntries = true),
        @CacheEvict(value = CacheConfig.CACHE_HUBS, allEntries = true)
      })
  public Hub createHub(HubRequest request) {
    City city =
        cityRepository
            .findById(request.getCityId())
            .orElseThrow(
                () -> new IllegalArgumentException("City not found: " + request.getCityId()));
    Hub hub =
        Hub.builder()
            .city(city)
            .name(request.getName())
            .hindiName(request.getHindiName())
            .code(request.getCode())
            .address(request.getAddress())
            .contactPhone(request.getContactPhone())
            .latitude(request.getLatitude())
            .longitude(request.getLongitude())
            .operatingRadiusKm(
                request.getOperatingRadiusKm() != null
                    ? request.getOperatingRadiusKm()
                    : new BigDecimal("25.00"))
            .active(true)
            .build();
    return hubRepository.save(hub);
  }

  @Override
  @Transactional(readOnly = true)
  @Cacheable(value = CacheConfig.CACHE_LOCATION_HIERARCHY)
  public List<StateHierarchyResponse> getLocationHierarchy() {
    List<Asset> activeAssets = locationQueryRepository.findActiveAssetsMappedToHubs();

    Map<Long, List<Asset>> assetsByHubId =
        activeAssets.stream()
            .filter(a -> a.getHub() != null && Boolean.TRUE.equals(a.getHub().getActive()))
            .collect(Collectors.groupingBy(a -> a.getHub().getId()));

    List<State> activeStates = locationQueryRepository.findActiveStates();
    List<StateHierarchyResponse> result = new ArrayList<>();

    for (State state : activeStates) {
      List<City> cities = locationQueryRepository.findActiveCitiesByStateId(state.getId());
      List<CityHierarchyResponse> cityDtos = new ArrayList<>();

      for (City city : cities) {
        List<Hub> hubsInCity = locationQueryRepository.findActiveHubsByCityId(city.getId());
        List<HubHierarchyResponse> hubDtos = new ArrayList<>();

        for (Hub hub : hubsInCity) {
          List<Asset> hubAssets = assetsByHubId.getOrDefault(hub.getId(), Collections.emptyList());

          Map<String, Integer> categoryCounts = new LinkedHashMap<>();
          categoryCounts.put("AGRICULTURE", 0);
          categoryCounts.put("CONSTRUCTION", 0);
          categoryCounts.put("MULTIPURPOSE_FLEET", 0);

          List<HubMachineResponse> machineDtos = new ArrayList<>();

          for (Asset a : hubAssets) {
            String catName = a.getCategory() != null ? a.getCategory().name() : "AGRICULTURE";
            categoryCounts.put(catName, categoryCounts.getOrDefault(catName, 0) + 1);

            machineDtos.add(
                HubMachineResponse.builder()
                    .assetId(a.getId())
                    .assetTag(a.getAssetTag())
                    .name(a.getName())
                    .modelName(a.getModelName())
                    .category(catName)
                    .categoryDescription(
                        a.getCategory() != null ? a.getCategory().getDescription() : "")
                    .dailyRate(a.getDailyRate())
                    .depositAmount(a.getDepositAmount())
                    .status(a.getStatus() != null ? a.getStatus().name() : "AVAILABLE")
                    .imageUrl(a.getImageUrl())
                    .conditionNotes(a.getConditionNotes())
                    .build());
          }

          hubDtos.add(
              HubHierarchyResponse.builder()
                  .hubId(hub.getId())
                  .hubName(hub.getName())
                  .hindiName(hub.getHindiName())
                  .hubCode(hub.getCode())
                  .address(hub.getAddress())
                  .contactPhone(
                      hub.getContactPhone() != null && !hub.getContactPhone().isBlank()
                          ? hub.getContactPhone()
                          : "+91 94674 79922")
                  .operatingRadiusKm(hub.getOperatingRadiusKm())
                  .latitude(hub.getLatitude())
                  .longitude(hub.getLongitude())
                  .totalMachineCount(hubAssets.size())
                  .categoryCounts(categoryCounts)
                  .machines(machineDtos)
                  .build());
        }

        cityDtos.add(
            CityHierarchyResponse.builder()
                .cityId(city.getId())
                .cityName(city.getName())
                .hindiName(city.getHindiName())
                .pinCode(city.getPinCode())
                .hubs(hubDtos)
                .build());
      }

      result.add(
          StateHierarchyResponse.builder()
              .stateId(state.getId())
              .stateName(state.getName())
              .hindiName(state.getHindiName())
              .stateCode(state.getCode())
              .cities(cityDtos)
              .build());
    }

    return result;
  }

  // ─── Active Machine Guards & Status Management ──────────────────────────────

  private void validateHubCanBeDeactivated(Hub hub) {
    long activeAssets = locationQueryRepository.countActiveAssetsByHubId(hub.getId());
    if (activeAssets > 0) {
      throw new Exceptions.BusinessRuleViolationException(
          String.format(
              "Cannot deactivate Hub '%s' (ID: %d): %d active machine(s) are currently stationed in this yard. Reassign or retire all machines before deactivating the hub.",
              hub.getName(), hub.getId(), activeAssets));
    }
  }

  private void validateCityCanBeDeactivated(City city) {
    long activeAssets = locationQueryRepository.countActiveAssetsByCityId(city.getId());
    if (activeAssets > 0) {
      throw new Exceptions.BusinessRuleViolationException(
          String.format(
              "Cannot deactivate City '%s' (ID: %d): %d active machine(s) currently exist in hubs under this city. Reassign or retire all machines before deactivating the city.",
              city.getName(), city.getId(), activeAssets));
    }
  }

  private void validateStateCanBeDeactivated(State state) {
    long activeAssets = locationQueryRepository.countActiveAssetsByStateId(state.getId());
    if (activeAssets > 0) {
      throw new Exceptions.BusinessRuleViolationException(
          String.format(
              "Cannot deactivate State '%s' (ID: %d): %d active machine(s) currently exist across hubs in this state. Reassign or retire all machines before deactivating the state.",
              state.getName(), state.getId(), activeAssets));
    }
  }

  @Override
  @Caching(
      evict = {
        @CacheEvict(value = CacheConfig.CACHE_LOCATION_HIERARCHY, allEntries = true),
        @CacheEvict(value = CacheConfig.CACHE_HUBS, allEntries = true)
      })
  public Hub updateHubStatus(Long hubId, boolean active) {
    Hub hub =
        hubRepository
            .findById(hubId)
            .orElseThrow(
                () -> new Exceptions.ResourceNotFoundException("Hub not found with ID: " + hubId));

    if (!active && Boolean.TRUE.equals(hub.getActive())) {
      validateHubCanBeDeactivated(hub);
    }

    hub.setActive(active);
    log.info(
        "[LocationService] Hub '{}' (ID: {}) status updated to active={}",
        hub.getName(),
        hub.getId(),
        active);
    return hubRepository.save(hub);
  }

  @Override
  @Caching(
      evict = {
        @CacheEvict(value = CacheConfig.CACHE_LOCATION_HIERARCHY, allEntries = true),
        @CacheEvict(value = CacheConfig.CACHE_HUBS, allEntries = true),
        @CacheEvict(value = CacheConfig.CACHE_CITIES, allEntries = true)
      })
  public City updateCityStatus(Long cityId, boolean active) {
    City city =
        cityRepository
            .findById(cityId)
            .orElseThrow(
                () ->
                    new Exceptions.ResourceNotFoundException("City not found with ID: " + cityId));

    if (!active && Boolean.TRUE.equals(city.getActive())) {
      validateCityCanBeDeactivated(city);
    }

    city.setActive(active);
    log.info(
        "[LocationService] City '{}' (ID: {}) status updated to active={}",
        city.getName(),
        city.getId(),
        active);
    return cityRepository.save(city);
  }

  @Override
  @Caching(
      evict = {
        @CacheEvict(value = CacheConfig.CACHE_STATES, allEntries = true),
        @CacheEvict(value = CacheConfig.CACHE_CITIES, allEntries = true),
        @CacheEvict(value = CacheConfig.CACHE_HUBS, allEntries = true),
        @CacheEvict(value = CacheConfig.CACHE_LOCATION_HIERARCHY, allEntries = true)
      })
  public State updateStateStatus(Long stateId, boolean active) {
    State state =
        stateRepository
            .findById(stateId)
            .orElseThrow(
                () ->
                    new Exceptions.ResourceNotFoundException(
                        "State not found with ID: " + stateId));

    if (!active && Boolean.TRUE.equals(state.getActive())) {
      validateStateCanBeDeactivated(state);
    }

    state.setActive(active);
    log.info(
        "[LocationService] State '{}' (ID: {}) status updated to active={}",
        state.getName(),
        state.getId(),
        active);
    return stateRepository.save(state);
  }

  @Override
  @Caching(
      evict = {
        @CacheEvict(value = CacheConfig.CACHE_LOCATION_HIERARCHY, allEntries = true),
        @CacheEvict(value = CacheConfig.CACHE_HUBS, allEntries = true)
      })
  public Hub updateHub(Long hubId, HubRequest request) {
    Hub hub =
        hubRepository
            .findById(hubId)
            .orElseThrow(
                () -> new Exceptions.ResourceNotFoundException("Hub not found with ID: " + hubId));

    if (request.getCityId() != null && !request.getCityId().equals(hub.getCity().getId())) {
      City newCity =
          cityRepository
              .findById(request.getCityId())
              .orElseThrow(
                  () ->
                      new Exceptions.ResourceNotFoundException(
                          "City not found with ID: " + request.getCityId()));
      hub.setCity(newCity);
    }

    if (request.getName() != null && !request.getName().isBlank()) {
      hub.setName(request.getName().trim());
    }
    if (request.getHindiName() != null) {
      hub.setHindiName(request.getHindiName().trim());
    }
    if (request.getCode() != null && !request.getCode().isBlank()) {
      hub.setCode(request.getCode().trim().toUpperCase());
    }
    if (request.getAddress() != null && !request.getAddress().isBlank()) {
      hub.setAddress(request.getAddress().trim());
    }
    if (request.getContactPhone() != null) {
      hub.setContactPhone(request.getContactPhone().trim());
    }
    if (request.getOperatingRadiusKm() != null) {
      hub.setOperatingRadiusKm(request.getOperatingRadiusKm());
    }
    if (request.getLatitude() != null) {
      hub.setLatitude(request.getLatitude());
    }
    if (request.getLongitude() != null) {
      hub.setLongitude(request.getLongitude());
    }

    return hubRepository.save(hub);
  }

  @Override
  @Caching(
      evict = {
        @CacheEvict(value = CacheConfig.CACHE_LOCATION_HIERARCHY, allEntries = true),
        @CacheEvict(value = CacheConfig.CACHE_HUBS, allEntries = true),
        @CacheEvict(value = CacheConfig.CACHE_CITIES, allEntries = true)
      })
  public City updateCity(Long cityId, CityRequest request) {
    City city =
        cityRepository
            .findById(cityId)
            .orElseThrow(
                () ->
                    new Exceptions.ResourceNotFoundException("City not found with ID: " + cityId));

    if (request.getStateId() != null && !request.getStateId().equals(city.getState().getId())) {
      State newState =
          stateRepository
              .findById(request.getStateId())
              .orElseThrow(
                  () ->
                      new Exceptions.ResourceNotFoundException(
                          "State not found with ID: " + request.getStateId()));
      city.setState(newState);
    }
    if (request.getName() != null && !request.getName().isBlank()) {
      city.setName(request.getName().trim());
    }
    if (request.getHindiName() != null) {
      city.setHindiName(request.getHindiName().trim());
    }
    if (request.getPinCode() != null) {
      city.setPinCode(request.getPinCode().trim());
    }

    return cityRepository.save(city);
  }

  @Override
  @Caching(
      evict = {
        @CacheEvict(value = CacheConfig.CACHE_STATES, allEntries = true),
        @CacheEvict(value = CacheConfig.CACHE_CITIES, allEntries = true),
        @CacheEvict(value = CacheConfig.CACHE_HUBS, allEntries = true),
        @CacheEvict(value = CacheConfig.CACHE_LOCATION_HIERARCHY, allEntries = true)
      })
  public State updateState(Long stateId, State request) {
    State state =
        stateRepository
            .findById(stateId)
            .orElseThrow(
                () ->
                    new Exceptions.ResourceNotFoundException(
                        "State not found with ID: " + stateId));

    if (request.getName() != null && !request.getName().isBlank()) {
      state.setName(request.getName().trim());
    }
    if (request.getHindiName() != null) {
      state.setHindiName(request.getHindiName().trim());
    }
    if (request.getCode() != null && !request.getCode().isBlank()) {
      state.setCode(request.getCode().trim().toUpperCase());
    }

    return stateRepository.save(state);
  }

  @Override
  @Caching(
      evict = {
        @CacheEvict(value = CacheConfig.CACHE_LOCATION_HIERARCHY, allEntries = true),
        @CacheEvict(value = CacheConfig.CACHE_HUBS, allEntries = true)
      })
  public void deleteHub(Long hubId) {
    Hub hub =
        hubRepository
            .findById(hubId)
            .orElseThrow(
                () -> new Exceptions.ResourceNotFoundException("Hub not found with ID: " + hubId));
    validateHubCanBeDeactivated(hub);
    hubRepository.delete(hub);
  }

  @Override
  @Caching(
      evict = {
        @CacheEvict(value = CacheConfig.CACHE_LOCATION_HIERARCHY, allEntries = true),
        @CacheEvict(value = CacheConfig.CACHE_HUBS, allEntries = true),
        @CacheEvict(value = CacheConfig.CACHE_CITIES, allEntries = true)
      })
  public void deleteCity(Long cityId) {
    City city =
        cityRepository
            .findById(cityId)
            .orElseThrow(
                () ->
                    new Exceptions.ResourceNotFoundException("City not found with ID: " + cityId));
    validateCityCanBeDeactivated(city);
    cityRepository.delete(city);
  }

  @Override
  @Caching(
      evict = {
        @CacheEvict(value = CacheConfig.CACHE_STATES, allEntries = true),
        @CacheEvict(value = CacheConfig.CACHE_CITIES, allEntries = true),
        @CacheEvict(value = CacheConfig.CACHE_HUBS, allEntries = true),
        @CacheEvict(value = CacheConfig.CACHE_LOCATION_HIERARCHY, allEntries = true)
      })
  public void deleteState(Long stateId) {
    State state =
        stateRepository
            .findById(stateId)
            .orElseThrow(
                () ->
                    new Exceptions.ResourceNotFoundException(
                        "State not found with ID: " + stateId));
    validateStateCanBeDeactivated(state);
    stateRepository.delete(state);
  }
}
