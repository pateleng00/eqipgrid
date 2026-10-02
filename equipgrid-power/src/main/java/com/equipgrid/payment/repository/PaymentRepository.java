package com.equipgrid.payment.repository;

import com.equipgrid.payment.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence repository for Payment entity.
 * Reporting sums, aggregations and search queries are in PaymentQueryRepository (QueryDSL).
 */
@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
}
