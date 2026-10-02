package com.equipgrid.dispatch.repository;

import com.equipgrid.dispatch.entity.DispatchRecord;
import com.equipgrid.dispatch.entity.QDispatchRecord;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Slf4j
@Repository
@AllArgsConstructor
@Transactional(readOnly = true)
public class DispatchQueryRepository {

    private final JPAQueryFactory queryFactory;
    private final QDispatchRecord qDispatch = QDispatchRecord.dispatchRecord;

    public Optional<DispatchRecord> fetchByBookingId(Long bookingId) {
        if (bookingId == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(
                queryFactory.selectFrom(qDispatch)
                        .where(qDispatch.booking.id.eq(bookingId))
                        .fetchOne()
        );
    }

    public Optional<DispatchRecord> fetchByChallanNumber(String challanNumber) {
        if (challanNumber == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(
                queryFactory.selectFrom(qDispatch)
                        .where(qDispatch.challanNumber.equalsIgnoreCase(challanNumber.trim()))
                        .fetchOne()
        );
    }

    public Optional<DispatchRecord> fetchById(Long id) {
        if (id == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(
                queryFactory.selectFrom(qDispatch)
                        .where(qDispatch.id.eq(id))
                        .fetchOne()
        );
    }
}
