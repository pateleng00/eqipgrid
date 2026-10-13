package com.equipgrid.payment.repository;
import com.equipgrid.payment.entity.PaymentProof;
import com.equipgrid.payment.enums.VerificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface PaymentProofRepository extends JpaRepository<PaymentProof,Long> { List<PaymentProof> findByStatusOrderBySubmittedAtAsc(VerificationStatus status); }
