package com.equipgrid.payment.repository;

import com.equipgrid.payment.entity.Payment;
import com.equipgrid.payment.entity.PaymentProof;
import com.equipgrid.payment.entity.QPayment;
import com.equipgrid.payment.entity.QPaymentProof;
import com.equipgrid.payment.entity.QRefundTransaction;
import com.equipgrid.payment.entity.RefundTransaction;
import com.equipgrid.payment.enums.PaymentMode;
import com.equipgrid.payment.enums.RefundStatus;
import com.equipgrid.payment.enums.VerificationStatus;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Repository
@AllArgsConstructor
@Transactional(readOnly = true)
public class PaymentQueryRepository {

  private final JPAQueryFactory queryFactory;
  private final QPayment qPayment = QPayment.payment;
  private final QPaymentProof qPaymentProof = QPaymentProof.paymentProof;
  private final QRefundTransaction qRefund = QRefundTransaction.refundTransaction;

  public List<Payment> fetchAll() {
    return queryFactory.selectFrom(qPayment).orderBy(qPayment.id.desc()).fetch();
  }

  public Optional<Payment> fetchById(Long id) {
    if (id == null) {
      return Optional.empty();
    }
    return Optional.ofNullable(
        queryFactory.selectFrom(qPayment).where(qPayment.id.eq(id)).fetchOne());
  }

  public List<Payment> fetchByBookingId(Long bookingId) {
    if (bookingId == null) {
      return List.of();
    }
    return queryFactory
        .selectFrom(qPayment)
        .where(qPayment.booking.id.eq(bookingId))
        .orderBy(qPayment.id.desc())
        .fetch();
  }

  public List<Payment> fetchByCustomerId(Long customerId) {
    if (customerId == null) {
      return List.of();
    }
    return queryFactory
        .selectFrom(qPayment)
        .where(qPayment.customer.id.eq(customerId))
        .orderBy(qPayment.id.desc())
        .fetch();
  }

  public List<Payment> fetchByCreatedAtBetween(LocalDateTime start, LocalDateTime end) {
    return queryFactory
        .selectFrom(qPayment)
        .where(qPayment.createdAt.between(start, end))
        .orderBy(qPayment.id.desc())
        .fetch();
  }

  public BigDecimal sumAmountByModeAndDateRange(
      PaymentMode mode, LocalDateTime start, LocalDateTime end) {
    BigDecimal sum =
        queryFactory
            .select(qPayment.amount.sum())
            .from(qPayment)
            .where(
                qPayment.paymentMode.eq(mode),
                qPayment.createdAt.goe(start),
                qPayment.createdAt.loe(end))
            .fetchOne();
    return sum != null ? sum : BigDecimal.ZERO;
  }

  public BigDecimal sumTotalByDateRange(LocalDateTime start, LocalDateTime end) {
    BigDecimal sum =
        queryFactory
            .select(qPayment.amount.sum())
            .from(qPayment)
            .where(qPayment.createdAt.goe(start), qPayment.createdAt.loe(end))
            .fetchOne();
    return sum != null ? sum : BigDecimal.ZERO;
  }

  public BigDecimal sumTotalAll() {
    BigDecimal sum = queryFactory.select(qPayment.amount.sum()).from(qPayment).fetchOne();
    return sum != null ? sum : BigDecimal.ZERO;
  }

  public Optional<Payment> fetchByTransactionRef(String transactionRef) {
    if (transactionRef == null || transactionRef.isBlank()) {
      return Optional.empty();
    }
    return Optional.ofNullable(
        queryFactory
            .selectFrom(qPayment)
            .where(qPayment.transactionRef.eq(transactionRef.trim()))
            .fetchOne());
  }

  public List<PaymentProof> fetchProofsByStatus(VerificationStatus status) {
    if (status == null) {
      return List.of();
    }
    return queryFactory
        .selectFrom(qPaymentProof)
        .where(qPaymentProof.status.eq(status))
        .orderBy(qPaymentProof.submittedAt.asc())
        .fetch();
  }

  public Optional<RefundTransaction> fetchFirstRefundByBookingIdAndStatus(
      Long bookingId, RefundStatus status) {
    if (bookingId == null || status == null) {
      return Optional.empty();
    }
    return Optional.ofNullable(
        queryFactory
            .selectFrom(qRefund)
            .where(qRefund.booking.id.eq(bookingId).and(qRefund.status.eq(status)))
            .fetchFirst());
  }

  public List<RefundTransaction> fetchAllRefunds() {
    return queryFactory.selectFrom(qRefund).orderBy(qRefund.id.desc()).fetch();
  }
}
