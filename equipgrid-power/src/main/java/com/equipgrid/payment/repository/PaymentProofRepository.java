package com.equipgrid.payment.repository;

import com.equipgrid.payment.entity.PaymentProof;
import com.equipgrid.payment.enums.VerificationStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentProofRepository extends JpaRepository<PaymentProof, Long> {
  List<PaymentProof> findByStatusOrderBySubmittedAtAsc(VerificationStatus status);
}
