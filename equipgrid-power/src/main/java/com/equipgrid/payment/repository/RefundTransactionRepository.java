package com.equipgrid.payment.repository;

import com.equipgrid.payment.entity.RefundTransaction;
import com.equipgrid.payment.enums.RefundStatus;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefundTransactionRepository extends JpaRepository<RefundTransaction, Long> {
  Optional<RefundTransaction> findFirstByBookingIdAndStatus(Long bookingId, RefundStatus status);
}
