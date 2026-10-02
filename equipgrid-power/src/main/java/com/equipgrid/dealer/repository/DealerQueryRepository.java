package com.equipgrid.dealer.repository;

import com.equipgrid.dealer.entity.Dealer;
import com.equipgrid.dealer.entity.DealerCommission;
import com.equipgrid.dealer.entity.QDealer;
import com.equipgrid.dealer.entity.QDealerCommission;
import com.equipgrid.dealer.enums.CommissionStatus;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Slf4j
@Repository
@AllArgsConstructor
@Transactional(readOnly = true)
public class DealerQueryRepository {

    private final JPAQueryFactory queryFactory;
    private final QDealer qDealer = QDealer.dealer;
    private final QDealerCommission qCommission = QDealerCommission.dealerCommission;

    public List<Dealer> fetchAllDealers() {
        return queryFactory.selectFrom(qDealer)
                .orderBy(qDealer.id.desc())
                .fetch();
    }

    public Optional<Dealer> fetchDealerById(Long id) {
        if (id == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(
                queryFactory.selectFrom(qDealer)
                        .where(qDealer.id.eq(id))
                        .fetchOne()
        );
    }

    public Optional<Dealer> fetchDealerByPhone(String phone) {
        if (phone == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(
                queryFactory.selectFrom(qDealer)
                        .where(qDealer.phone.eq(phone.trim()))
                        .fetchOne()
        );
    }

    public List<DealerCommission> fetchCommissionsByDealerId(Long dealerId) {
        if (dealerId == null) {
            return List.of();
        }
        return queryFactory.selectFrom(qCommission)
                .where(qCommission.dealer.id.eq(dealerId))
                .orderBy(qCommission.id.desc())
                .fetch();
    }

    public Optional<DealerCommission> fetchCommissionByBookingId(Long bookingId) {
        if (bookingId == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(
                queryFactory.selectFrom(qCommission)
                        .where(qCommission.booking.id.eq(bookingId))
                        .fetchOne()
        );
    }

    public Optional<DealerCommission> fetchCommissionById(Long id) {
        if (id == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(
                queryFactory.selectFrom(qCommission)
                        .where(qCommission.id.eq(id))
                        .fetchOne()
        );
    }

    public BigDecimal sumTotalCommissionByDealer(Long dealerId) {
        if (dealerId == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal sum = queryFactory.select(qCommission.commissionAmount.sum())
                .from(qCommission)
                .where(qCommission.dealer.id.eq(dealerId))
                .fetchOne();
        return sum != null ? sum : BigDecimal.ZERO;
    }

    public BigDecimal sumPendingCommissions() {
        BigDecimal sum = queryFactory.select(qCommission.commissionAmount.sum())
                .from(qCommission)
                .where(qCommission.status.eq(CommissionStatus.PENDING))
                .fetchOne();
        return sum != null ? sum : BigDecimal.ZERO;
    }
}
