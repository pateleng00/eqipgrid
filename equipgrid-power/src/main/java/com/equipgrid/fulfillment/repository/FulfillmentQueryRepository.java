package com.equipgrid.fulfillment.repository;

import com.equipgrid.fulfillment.entity.DeliveryJob;
import com.equipgrid.fulfillment.entity.QDeliveryJob;
import com.equipgrid.fulfillment.entity.QReturnPickupJob;
import com.equipgrid.fulfillment.entity.ReturnPickupJob;
import com.querydsl.jpa.impl.JPAQueryFactory;
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
public class FulfillmentQueryRepository {

  private final JPAQueryFactory queryFactory;
  private final QDeliveryJob qDelivery = QDeliveryJob.deliveryJob;
  private final QReturnPickupJob qPickup = QReturnPickupJob.returnPickupJob;

  public Optional<DeliveryJob> fetchDeliveryJobByBookingId(Long bookingId) {
    if (bookingId == null) {
      return Optional.empty();
    }
    return Optional.ofNullable(
        queryFactory.selectFrom(qDelivery).where(qDelivery.booking.id.eq(bookingId)).fetchOne());
  }

  public Optional<ReturnPickupJob> fetchReturnPickupJobByBookingId(Long bookingId) {
    if (bookingId == null) {
      return Optional.empty();
    }
    return Optional.ofNullable(
        queryFactory.selectFrom(qPickup).where(qPickup.booking.id.eq(bookingId)).fetchOne());
  }

  public List<DeliveryJob> fetchAllDeliveryJobs() {
    return queryFactory.selectFrom(qDelivery).orderBy(qDelivery.id.desc()).fetch();
  }

  public List<ReturnPickupJob> fetchAllReturnPickupJobs() {
    return queryFactory.selectFrom(qPickup).orderBy(qPickup.id.desc()).fetch();
  }

  public Optional<DeliveryJob> fetchDeliveryJobById(Long id) {
    if (id == null) {
      return Optional.empty();
    }
    return Optional.ofNullable(
        queryFactory.selectFrom(qDelivery).where(qDelivery.id.eq(id)).fetchOne());
  }

  public Optional<ReturnPickupJob> fetchReturnPickupJobById(Long id) {
    if (id == null) {
      return Optional.empty();
    }
    return Optional.ofNullable(
        queryFactory.selectFrom(qPickup).where(qPickup.id.eq(id)).fetchOne());
  }
}
