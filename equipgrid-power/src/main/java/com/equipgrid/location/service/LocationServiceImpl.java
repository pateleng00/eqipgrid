package com.equipgrid.location.service;

import com.equipgrid.asset.entity.Asset;
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
    return locationQueryRepository.findActiveStates();
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
    return locationQueryRepository.findAllActiveCities();
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
    return locationQueryRepository.findAllActiveHubs();
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
          List<Asset> hubAssets = assetsByHubId.get(hub.getId());
          // CONDITION: At least 1 machine mapped with hub location address
          if (hubAssets != null && !hubAssets.isEmpty()) {
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
        }

        // Only include city if at least one hub with active machine
        if (!hubDtos.isEmpty()) {
          cityDtos.add(
              CityHierarchyResponse.builder()
                  .cityId(city.getId())
                  .cityName(city.getName())
                  .pinCode(city.getPinCode())
                  .hubs(hubDtos)
                  .build());
        }
      }

      // Only include state if at least one city with active hub
      if (!cityDtos.isEmpty()) {
        result.add(
            StateHierarchyResponse.builder()
                .stateId(state.getId())
                .stateName(state.getName())
                .stateCode(state.getCode())
                .cities(cityDtos)
                .build());
      }
    }

    return result;
  }
}
