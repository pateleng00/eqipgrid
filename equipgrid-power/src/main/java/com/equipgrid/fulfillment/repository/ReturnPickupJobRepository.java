package com.equipgrid.fulfillment.repository;

import com.equipgrid.fulfillment.entity.ReturnPickupJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence repository for ReturnPickupJob entity. Read queries are in FulfillmentQueryRepository
 * (QueryDSL).
 */
@Repository
public interface ReturnPickupJobRepository extends JpaRepository<ReturnPickupJob, Long> {}
