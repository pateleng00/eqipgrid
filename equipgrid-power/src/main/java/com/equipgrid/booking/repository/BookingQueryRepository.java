package com.equipgrid.booking.repository;

import com.equipgrid.booking.entity.Booking;
import com.equipgrid.booking.entity.QBooking;
import com.equipgrid.booking.enums.BookingStatus;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Slf4j
@Repository
@AllArgsConstructor
@Transactional(readOnly = true)
public class BookingQueryRepository {

    private static final List<BookingStatus> ACTIVE_RENTAL_STATUSES = List.of(
            BookingStatus.CONFIRMED,
            BookingStatus.ALLOCATED,
            BookingStatus.DISPATCH_READY,
            BookingStatus.DISPATCHED,
            BookingStatus.ON_RENT
    );
    private final JPAQueryFactory queryFactory;
    private final QBooking qBooking = QBooking.booking;

    public List<Booking> fetchAll(BookingStatus status) {
        BooleanBuilder builder = new BooleanBuilder();
        if (status != null) {
            builder.and(qBooking.status.eq(status));
        }
        return queryFactory.selectFrom(qBooking)
                .where(builder)
                .orderBy(qBooking.id.desc())
                .fetch();
    }

    public Optional<Booking> fetchById(Long id) {
        if (id == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(
                queryFactory.selectFrom(qBooking)
                        .where(qBooking.id.eq(id))
                        .fetchOne()
        );
    }

    public Optional<Booking> fetchByBookingNumber(String bookingNumber) {
        if (bookingNumber == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(
                queryFactory.selectFrom(qBooking)
                        .where(qBooking.bookingNumber.equalsIgnoreCase(bookingNumber.trim()))
                        .fetchOne()
        );
    }

    public List<Booking> fetchByCustomerId(Long customerId) {
        if (customerId == null) {
            return List.of();
        }
        return queryFactory.selectFrom(qBooking)
                .where(qBooking.customer.id.eq(customerId))
                .orderBy(qBooking.id.desc())
                .fetch();
    }

    public List<Booking> fetchByAssetId(Long assetId) {
        if (assetId == null) {
            return List.of();
        }
        return queryFactory.selectFrom(qBooking)
                .where(qBooking.asset.id.eq(assetId))
                .orderBy(qBooking.id.desc())
                .fetch();
    }

    public long countByStatus(BookingStatus status) {
        if (status == null) {
            return 0;
        }
        Long count = queryFactory.select(qBooking.count())
                .from(qBooking)
                .where(qBooking.status.eq(status))
                .fetchOne();
        return count != null ? count : 0L;
    }

    public long countConflictingBookings(Long assetId, LocalDate startDate, LocalDate endDate) {
        Long count = queryFactory.select(qBooking.count())
                .from(qBooking)
                .where(
                        qBooking.asset.id.eq(assetId),
                        qBooking.status.in(ACTIVE_RENTAL_STATUSES),
                        qBooking.startDate.loe(endDate),
                        qBooking.endDate.goe(startDate)
                )
                .fetchOne();
        return count != null ? count : 0L;
    }

    public List<Long> fetchConflictingAssetIdsForType(Long typeId, String name, Long hubId, LocalDate startDate, LocalDate endDate) {
        BooleanBuilder builder = new BooleanBuilder();
        builder.and(qBooking.status.in(ACTIVE_RENTAL_STATUSES));
        builder.and(qBooking.startDate.loe(endDate));
        builder.and(qBooking.endDate.goe(startDate));

        if (typeId != null) {
            builder.and(qBooking.asset.type.id.eq(typeId));
        } else if (name != null && !name.isBlank()) {
            builder.and(qBooking.asset.name.equalsIgnoreCase(name.trim()));
        }

        if (hubId != null) {
            builder.and(qBooking.asset.hub.id.eq(hubId));
        }

        return queryFactory.select(qBooking.asset.id)
                .from(qBooking)
                .where(builder)
                .distinct()
                .fetch();
    }

    public long countConflictingBookingsForType(Long typeId, String name, Long hubId, LocalDate startDate, LocalDate endDate) {
        List<Long> lockedIds = fetchConflictingAssetIdsForType(typeId, name, hubId, startDate, endDate);
        return lockedIds.size();
    }
}
