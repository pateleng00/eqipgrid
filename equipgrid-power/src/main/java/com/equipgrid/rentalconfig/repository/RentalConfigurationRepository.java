package com.equipgrid.rentalconfig.repository;

import com.equipgrid.rentalconfig.entity.RentalConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence repository for RentalConfiguration entity. Read queries and multi-tier rate lookups
 * are handled in RentalConfigurationQueryRepository (QueryDSL).
 */
@Repository
public interface RentalConfigurationRepository extends JpaRepository<RentalConfiguration, Long> {}
