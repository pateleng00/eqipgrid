package com.equipgrid.fulfillment.repository;

import com.equipgrid.fulfillment.entity.DeliveryJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence repository for DeliveryJob entity. Read queries are in FulfillmentQueryRepository
 * (QueryDSL).
 */
@Repository
public interface DeliveryJobRepository extends JpaRepository<DeliveryJob, Long> {}
