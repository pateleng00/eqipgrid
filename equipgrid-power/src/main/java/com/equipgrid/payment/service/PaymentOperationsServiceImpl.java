package com.equipgrid.payment.service;

import com.equipgrid.booking.entity.Booking;
import com.equipgrid.booking.repository.BookingQueryRepository;
import com.equipgrid.booking.repository.BookingRepository;
import com.equipgrid.payment.dto.request.CompleteRefundRequest;
import com.equipgrid.payment.dto.request.RecordPaymentRequest;
import com.equipgrid.payment.dto.request.SubmitProofRequest;
import com.equipgrid.payment.dto.request.VerifyProofRequest;
import com.equipgrid.payment.entity.PaymentProof;
import com.equipgrid.payment.entity.RefundTransaction;
import com.equipgrid.payment.enums.PaymentMode;
import com.equipgrid.payment.enums.PaymentType;
import com.equipgrid.payment.enums.RefundStatus;
import com.equipgrid.payment.enums.VerificationStatus;
import com.equipgrid.payment.repository.PaymentProofRepository;
import com.equipgrid.payment.repository.PaymentQueryRepository;
import com.equipgrid.payment.repository.RefundTransactionRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PaymentOperationsServiceImpl implements IPaymentOperationsService {

  private final PaymentProofRepository proofs;
  private final RefundTransactionRepository refunds;
  private final PaymentQueryRepository paymentQueryRepository;
  private final BookingRepository bookingRepository;
  private final BookingQueryRepository bookingQueryRepository;
  private final IPaymentService payments;

  @Override
  public PaymentProof submitPaymentProof(SubmitProofRequest request) {
    Booking booking = null;
    if (request.getBookingId() != null) {
      booking = bookingRepository.findById(request.getBookingId()).orElse(null);
    }
    if (booking == null
        && request.getBookingNumber() != null
        && !request.getBookingNumber().isBlank()) {
      booking =
          bookingQueryRepository.fetchByBookingNumber(request.getBookingNumber()).orElse(null);
    }
    if (booking == null) {
      throw new IllegalArgumentException("Booking not found with given id or bookingNumber");
    }

    StringBuilder refBuilder = new StringBuilder();
    if (request.getSubmittedReference() != null && !request.getSubmittedReference().isBlank()) {
      refBuilder.append(request.getSubmittedReference().trim());
    }
    if (request.getProofImageUrl() != null && !request.getProofImageUrl().isBlank()) {
      if (refBuilder.length() > 0) refBuilder.append(" | Screenshot: ");
      refBuilder.append(request.getProofImageUrl().trim());
    }

    PaymentProof proof =
        PaymentProof.builder()
            .booking(booking)
            .submittedReference(
                refBuilder.length() > 0 ? refBuilder.toString() : "Payment Proof Submitted")
            .status(VerificationStatus.PENDING)
            .submittedAt(LocalDateTime.now())
            .verificationNotes(
                request.getNotes() != null && !request.getNotes().isBlank()
                    ? request.getNotes().trim()
                    : "Submitted via Website Online Portal")
            .build();

    log.info(
        "[PaymentOperations] Registered customer payment proof for booking {}: ref={}",
        booking.getBookingNumber(),
        proof.getSubmittedReference());
    return proofs.save(proof);
  }

  @Override
  @Transactional(readOnly = true)
  public List<PaymentProof> getPendingProofs() {
    return paymentQueryRepository.fetchProofsByStatus(VerificationStatus.PENDING);
  }

  @Override
  public PaymentProof verifyPaymentProof(Long id, VerifyProofRequest request) {
    PaymentProof proof =
        proofs
            .findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Payment proof not found: " + id));

    if (proof.getStatus() != VerificationStatus.PENDING) {
      throw new IllegalStateException("Payment proof already reviewed");
    }

    Booking booking = proof.getBooking();
    String actor =
        request.getVerifiedBy() != null && !request.getVerifiedBy().isBlank()
            ? request.getVerifiedBy()
            : "PAYMENT_RECONCILIATION";

    payments.recordPayment(
        RecordPaymentRequest.builder()
            .bookingId(booking.getId())
            .amount(request.getAmount() == null ? booking.getTotalAmount() : request.getAmount())
            .paymentType(
                request.getPaymentType() == null ? PaymentType.ADVANCE : request.getPaymentType())
            .paymentMode(PaymentMode.UPI)
            .transactionRef(proof.getSubmittedReference())
            .notes("Verified payment proof")
            .build(),
        actor);

    proof.setStatus(VerificationStatus.VERIFIED);
    proof.setVerifiedAt(LocalDateTime.now());
    proof.setVerifiedBy(actor);
    proof.setVerificationNotes(request.getNotes());
    return proofs.save(proof);
  }

  @Override
  @Transactional(readOnly = true)
  public List<RefundTransaction> getAllRefunds() {
    return paymentQueryRepository.fetchAllRefunds();
  }

  @Override
  public RefundTransaction completeRefund(Long id, CompleteRefundRequest request) {
    RefundTransaction refund =
        refunds
            .findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Refund transaction not found: " + id));
    refund.setStatus(RefundStatus.COMPLETED);
    refund.setPaymentReference(request.getPaymentReference());
    refund.setCompletedAt(LocalDateTime.now());
    return refunds.save(refund);
  }
}
