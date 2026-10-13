package com.equipgrid.fulfillment.repository;
import com.equipgrid.fulfillment.entity.DeliveryJob;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface DeliveryJobRepository extends JpaRepository<DeliveryJob, Long> { Optional<DeliveryJob> findByBookingId(Long bookingId); }
