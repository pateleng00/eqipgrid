package com.equipgrid.farmlocation.service;

import com.equipgrid.common.Exceptions;
import com.equipgrid.customer.service.ICustomerService;
import com.equipgrid.farmlocation.dto.request.UpsertFarmLocationRequest;
import com.equipgrid.farmlocation.entity.FarmLocation;
import com.equipgrid.farmlocation.repository.FarmLocationQueryRepository;
import com.equipgrid.farmlocation.repository.FarmLocationRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FarmLocationServiceImpl implements IFarmLocationService {
  private final FarmLocationRepository farmLocationRepository;
  private final FarmLocationQueryRepository farmLocationQueryRepository;
  private final ICustomerService customerService;

  @Override
  @Transactional(readOnly = true)
  public List<FarmLocation> getCustomerLocations(Long customerId) {
    customerService.getCustomerById(customerId);
    return farmLocationQueryRepository.fetchByCustomerId(customerId);
  }

  @Override
  @Transactional(readOnly = true)
  public FarmLocation getCustomerLocation(Long customerId, Long locationId) {
    return farmLocationQueryRepository
        .fetchByIdAndCustomerId(locationId, customerId)
        .orElseThrow(
            () -> new Exceptions.ResourceNotFoundException("Saved farm location not found"));
  }

  @Override
  @Transactional
  public FarmLocation create(Long customerId, UpsertFarmLocationRequest request) {
    FarmLocation location =
        FarmLocation.builder().customer(customerService.getCustomerById(customerId)).build();
    apply(location, request);
    normalizeDefault(customerId, location);
    return farmLocationRepository.save(location);
  }

  @Override
  @Transactional
  public FarmLocation update(Long customerId, Long locationId, UpsertFarmLocationRequest request) {
    FarmLocation location = getCustomerLocation(customerId, locationId);
    apply(location, request);
    normalizeDefault(customerId, location);
    return farmLocationRepository.save(location);
  }

  private void normalizeDefault(Long customerId, FarmLocation target) {
    if (!Boolean.TRUE.equals(target.getIsDefault())) return;
    farmLocationQueryRepository.fetchByCustomerId(customerId).stream()
        .filter(location -> !location.getId().equals(target.getId()))
        .forEach(location -> location.setIsDefault(false));
  }

  private void apply(FarmLocation location, UpsertFarmLocationRequest request) {
    location.setLocalName(request.getLocalName().trim());
    location.setLocalNameHindi(request.getLocalNameHindi());
    location.setAliases(request.getAliases());
    location.setLocationType(
        request.getLocationType() != null
            ? request.getLocationType()
            : (location.getLocationType() != null
                ? location.getLocationType()
                : com.equipgrid.farmlocation.enums.FarmLocationType.FARM));
    location.setLatitude(request.getLatitude());
    location.setLongitude(request.getLongitude());
    location.setVillage(request.getVillage());
    location.setTehsil(request.getTehsil());
    location.setDistrict(request.getDistrict());
    location.setLandmark(request.getLandmark());
    location.setAccessNotes(request.getAccessNotes());
    location.setDeliveryContactName(request.getDeliveryContactName());
    location.setDeliveryContactPhone(request.getDeliveryContactPhone());
    location.setIsDefault(Boolean.TRUE.equals(request.getIsDefault()));
  }
}
