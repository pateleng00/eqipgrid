package com.equipgrid.farmlocation.service;

import com.equipgrid.farmlocation.dto.request.UpsertFarmLocationRequest;
import com.equipgrid.farmlocation.entity.FarmLocation;

import java.util.List;

public interface IFarmLocationService {
    List<FarmLocation> getCustomerLocations(Long customerId);
    FarmLocation getCustomerLocation(Long customerId, Long locationId);
    FarmLocation create(Long customerId, UpsertFarmLocationRequest request);
    FarmLocation update(Long customerId, Long locationId, UpsertFarmLocationRequest request);
}
