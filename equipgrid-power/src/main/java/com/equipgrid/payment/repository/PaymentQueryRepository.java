package com.equipgrid.payment.repository;

import com.equipgrid.payment.entity.Payment;
import com.equipgrid.payment.entity.QPayment;
import com.equipgrid.payment.enums.PaymentMode;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Repository
@AllArgsConstructor
@Transactional(readOnly = true)
public class PaymentQueryRepository {

    private final JPAQueryFactory queryFactory;
    private final QPayment qPayment = QPayment.payment;

    public List<Payment> fetchAll() {
        return queryFactory.selectFrom(qPayment)
                .orderBy(qPayment.id.desc())
                .fetch();
    }

    public Optional<Payment> fetchById(Long id) {
        if (id == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(
                queryFactory.selectFrom(qPayment)
                        .where(qPayment.id.eq(id))
                        .fetchOne()
        );
    }

    public List<Payment> fetchByBookingId(Long bookingId) {
        if (bookingId == null) {
            return List.of();
        }
        return queryFactory.selectFrom(qPayment)
                .where(qPayment.booking.id.eq(bookingId))
                .orderBy(qPayment.id.desc())
                .fetch();
    }

    public List<Payment> fetchByCustomerId(Long customerId) {
        if (customerId == null) {
            return List.of();
        }
        return queryFactory.selectFrom(qPayment)
                .where(qPayment.customer.id.eq(customerId))
                .orderBy(qPayment.id.desc())
                .fetch();
    }

    public List<Payment> fetchByCreatedAtBetween(LocalDateTime start, LocalDateTime end) {
        return queryFactory.selectFrom(qPayment)
                .where(qPayment.createdAt.between(start, end))
                .orderBy(qPayment.id.desc())
                .fetch();
    }

    public BigDecimal sumAmountByModeAndDateRange(PaymentMode mode, LocalDateTime start, LocalDateTime end) {
        BigDecimal sum = queryFactory.select(qPayment.amount.sum())
                .from(qPayment)
                .where(
                        qPayment.paymentMode.eq(mode),
                        qPayment.createdAt.goe(start),
                        qPayment.createdAt.loe(end)
                )
                .fetchOne();
        return sum != null ? sum : BigDecimal.ZERO;
    }

    public BigDecimal sumTotalByDateRange(LocalDateTime start, LocalDateTime end) {
        BigDecimal sum = queryFactory.select(qPayment.amount.sum())
                .from(qPayment)
                .where(
                        qPayment.createdAt.goe(start),
                        qPayment.createdAt.loe(end)
                )
                .fetchOne();
        return sum != null ? sum : BigDecimal.ZERO;
    }

    public BigDecimal sumTotalAll() {
        BigDecimal sum = queryFactory.select(qPayment.amount.sum())
                .from(qPayment)
                .fetchOne();
        return sum != null ? sum : BigDecimal.ZERO;
    }
}
