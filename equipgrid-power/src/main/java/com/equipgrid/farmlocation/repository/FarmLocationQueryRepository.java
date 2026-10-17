package com.equipgrid.farmlocation.repository;

import com.equipgrid.farmlocation.entity.FarmLocation;
import com.equipgrid.farmlocation.entity.QFarmLocation;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.math.BigDecimal;
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
public class FarmLocationQueryRepository {

  private final JPAQueryFactory queryFactory;
  private final QFarmLocation qLoc = QFarmLocation.farmLocation;

  public List<FarmLocation> fetchByCustomerId(Long customerId) {
    if (customerId == null) {
      return List.of();
    }
    return queryFactory
        .selectFrom(qLoc)
        .where(qLoc.customer.id.eq(customerId).and(qLoc.active.isTrue()))
        .orderBy(qLoc.isDefault.desc(), qLoc.lastUsedAt.desc())
        .fetch();
  }

  public Optional<FarmLocation> fetchByIdAndCustomerId(Long id, Long customerId) {
    if (id == null || customerId == null) {
      return Optional.empty();
    }
    return Optional.ofNullable(
        queryFactory
            .selectFrom(qLoc)
            .where(qLoc.id.eq(id).and(qLoc.customer.id.eq(customerId)).and(qLoc.active.isTrue()))
            .fetchOne());
  }

  public Optional<FarmLocation> fetchFirstByCustomerAndCoordinates(
      Long customerId, BigDecimal latitude, BigDecimal longitude) {
    if (customerId == null || latitude == null || longitude == null) {
      return Optional.empty();
    }
    return Optional.ofNullable(
        queryFactory
            .selectFrom(qLoc)
            .where(
                qLoc.customer
                    .id
                    .eq(customerId)
                    .and(qLoc.latitude.eq(latitude))
                    .and(qLoc.longitude.eq(longitude)))
            .fetchFirst());
  }

  public Optional<FarmLocation> fetchFirstByCustomerAndLocalName(
      Long customerId, String localName) {
    if (customerId == null || localName == null || localName.isBlank()) {
      return Optional.empty();
    }
    return Optional.ofNullable(
        queryFactory
            .selectFrom(qLoc)
            .where(
                qLoc.customer
                    .id
                    .eq(customerId)
                    .and(qLoc.localName.equalsIgnoreCase(localName.trim()))
                    .and(qLoc.active.isTrue()))
            .fetchFirst());
  }
}
