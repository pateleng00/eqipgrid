package com.equipgrid.fulfillment.repository;

import com.equipgrid.fulfillment.entity.ReturnPickupJob;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReturnPickupJobRepository extends JpaRepository<ReturnPickupJob, Long> {
  Optional<ReturnPickupJob> findByBookingId(Long bookingId);
}
