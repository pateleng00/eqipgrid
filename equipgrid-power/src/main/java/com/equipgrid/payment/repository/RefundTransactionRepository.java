package com.equipgrid.payment.repository;

import com.equipgrid.payment.entity.RefundTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence repository for RefundTransaction entity. Read and status queries are handled in
 * PaymentQueryRepository (QueryDSL).
 */
@Repository
public interface RefundTransactionRepository extends JpaRepository<RefundTransaction, Long> {}
