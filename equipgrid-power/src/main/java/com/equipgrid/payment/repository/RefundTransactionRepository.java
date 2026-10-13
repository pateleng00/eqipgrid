package com.equipgrid.payment.repository;
import com.equipgrid.payment.entity.RefundTransaction;
import com.equipgrid.payment.enums.RefundStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface RefundTransactionRepository extends JpaRepository<RefundTransaction, Long> { Optional<RefundTransaction> findFirstByBookingIdAndStatus(Long bookingId, RefundStatus status); }
