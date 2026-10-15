package com.equipgrid.rentalconfig.service;

import com.equipgrid.rentalconfig.dto.request.CreateRentalConfigRequest;
import com.equipgrid.rentalconfig.dto.request.UpdateRentalConfigRequest;
import com.equipgrid.rentalconfig.entity.RentalConfiguration;
import java.util.List;

public interface IRentalConfigService {

  List<RentalConfiguration> getRentalConfigs(Long hubId, Long assetId);

  RentalConfiguration createRentalConfig(CreateRentalConfigRequest request);

  RentalConfiguration updateRentalConfig(Long id, UpdateRentalConfigRequest request);

  void deleteRentalConfig(Long id);
}
