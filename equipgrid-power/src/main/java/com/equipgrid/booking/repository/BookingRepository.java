package com.equipgrid.booking.repository;

import com.equipgrid.booking.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence repository for Booking entity.
 * Complex queries, availability checks and state filters are handled in BookingQueryRepository (QueryDSL).
 */
@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
}
