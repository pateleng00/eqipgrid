package com.equipgrid.returninspection.repository;

import com.equipgrid.returninspection.entity.QReturnInspection;
import com.equipgrid.returninspection.entity.ReturnInspection;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Slf4j
@Repository
@AllArgsConstructor
@Transactional(readOnly = true)
public class ReturnInspectionQueryRepository {

    private final JPAQueryFactory queryFactory;
    private final QReturnInspection qInspection = QReturnInspection.returnInspection;

    public List<ReturnInspection> fetchByBookingId(Long bookingId) {
        if (bookingId == null) {
            return List.of();
        }
        return queryFactory.selectFrom(qInspection)
                .where(qInspection.booking.id.eq(bookingId))
                .orderBy(qInspection.id.asc())
                .fetch();
    }

    public List<ReturnInspection> fetchByAssetId(Long assetId) {
        if (assetId == null) {
            return List.of();
        }
        return queryFactory.selectFrom(qInspection)
                .where(qInspection.asset.id.eq(assetId))
                .orderBy(qInspection.id.desc())
                .fetch();
    }

    public Optional<ReturnInspection> fetchById(Long id) {
        if (id == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(
                queryFactory.selectFrom(qInspection)
                        .where(qInspection.id.eq(id))
                        .fetchOne()
        );
    }
}
