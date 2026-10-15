package com.equipgrid.fulfillment.repository;

import com.equipgrid.fulfillment.entity.DeliveryJob;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeliveryJobRepository extends JpaRepository<DeliveryJob, Long> {
  Optional<DeliveryJob> findByBookingId(Long bookingId);
}
