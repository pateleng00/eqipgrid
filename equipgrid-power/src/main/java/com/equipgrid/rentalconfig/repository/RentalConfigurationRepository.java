package com.equipgrid.rentalconfig.repository;

import com.equipgrid.rentalconfig.entity.RentalConfiguration;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RentalConfigurationRepository extends JpaRepository<RentalConfiguration, Long> {
  List<RentalConfiguration> findByActiveTrueOrderByIdDesc();

  List<RentalConfiguration> findByHubIdAndActiveTrue(Long hubId);

  List<RentalConfiguration> findByAssetIdAndActiveTrue(Long assetId);

  Optional<RentalConfiguration> findFirstByAssetIdAndHubIdAndActiveTrue(Long assetId, Long hubId);

  List<RentalConfiguration> findByAssetIdAndHubIdAndActiveTrue(Long assetId, Long hubId);

  List<RentalConfiguration> findByTypeIdAndActiveTrue(Long typeId);

  List<RentalConfiguration> findByTypeIdAndHubIdAndActiveTrue(Long typeId, Long hubId);

  Optional<RentalConfiguration> findFirstByAssetIdAndActiveTrue(Long assetId);

  Optional<RentalConfiguration> findFirstByHubIdAndActiveTrue(Long hubId);
}
