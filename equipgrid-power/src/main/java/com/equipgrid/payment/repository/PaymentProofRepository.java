package com.equipgrid.payment.repository;

import com.equipgrid.payment.entity.PaymentProof;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence repository for PaymentProof entity. Read and status queries are handled in
 * PaymentQueryRepository (QueryDSL).
 */
@Repository
public interface PaymentProofRepository extends JpaRepository<PaymentProof, Long> {}
