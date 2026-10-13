package com.equipgrid.farmlocation.repository;

import com.equipgrid.farmlocation.entity.FarmLocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FarmLocationRepository extends JpaRepository<FarmLocation, Long> {
    List<FarmLocation> findByCustomerIdAndActiveTrueOrderByIsDefaultDescLastUsedAtDesc(Long customerId);
    Optional<FarmLocation> findByIdAndCustomerIdAndActiveTrue(Long id, Long customerId);
    Optional<FarmLocation> findFirstByCustomerIdAndLatitudeAndLongitude(Long customerId, java.math.BigDecimal latitude, java.math.BigDecimal longitude);
}
