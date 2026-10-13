package com.equipgrid.fulfillment.repository;
import com.equipgrid.fulfillment.entity.ReturnPickupJob;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface ReturnPickupJobRepository extends JpaRepository<ReturnPickupJob, Long> { Optional<ReturnPickupJob> findByBookingId(Long bookingId); }
