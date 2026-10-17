package com.equipgrid.rentalconfig.repository;

import com.equipgrid.rentalconfig.entity.QRentalConfiguration;
import com.equipgrid.rentalconfig.entity.RentalConfiguration;
import com.querydsl.core.BooleanBuilder;
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
public class RentalConfigurationQueryRepository {

  private final JPAQueryFactory queryFactory;
  private final QRentalConfiguration qConfig = QRentalConfiguration.rentalConfiguration;

  public List<RentalConfiguration> fetchRentalConfigs(Long hubId, Long assetId) {
    BooleanBuilder builder = new BooleanBuilder();
    builder.and(qConfig.active.isTrue());
    if (hubId != null) {
      builder.and(qConfig.hub.id.eq(hubId));
    }
    if (assetId != null) {
      builder.and(qConfig.asset.id.eq(assetId));
    }
    return queryFactory
        .selectFrom(qConfig)
        .leftJoin(qConfig.hub)
        .fetchJoin()
        .leftJoin(qConfig.asset)
        .fetchJoin()
        .leftJoin(qConfig.type)
        .fetchJoin()
        .leftJoin(qConfig.billingUnitMaster)
        .fetchJoin()
        .where(builder)
        .orderBy(qConfig.id.desc())
        .fetch();
  }

  public List<RentalConfiguration> fetchByAssetIdAndHubId(Long assetId, Long hubId) {
    if (assetId == null || hubId == null) {
      return List.of();
    }
    return queryFactory
        .selectFrom(qConfig)
        .leftJoin(qConfig.hub)
        .fetchJoin()
        .leftJoin(qConfig.asset)
        .fetchJoin()
        .leftJoin(qConfig.type)
        .fetchJoin()
        .leftJoin(qConfig.billingUnitMaster)
        .fetchJoin()
        .where(
            qConfig.asset.id.eq(assetId).and(qConfig.hub.id.eq(hubId)).and(qConfig.active.isTrue()))
        .fetch();
  }

  public List<RentalConfiguration> fetchByAssetId(Long assetId) {
    if (assetId == null) {
      return List.of();
    }
    return queryFactory
        .selectFrom(qConfig)
        .leftJoin(qConfig.hub)
        .fetchJoin()
        .leftJoin(qConfig.asset)
        .fetchJoin()
        .leftJoin(qConfig.type)
        .fetchJoin()
        .leftJoin(qConfig.billingUnitMaster)
        .fetchJoin()
        .where(qConfig.asset.id.eq(assetId).and(qConfig.active.isTrue()))
        .fetch();
  }

  public List<RentalConfiguration> fetchByTypeIdAndHubId(Long typeId, Long hubId) {
    if (typeId == null || hubId == null) {
      return List.of();
    }
    return queryFactory
        .selectFrom(qConfig)
        .leftJoin(qConfig.hub)
        .fetchJoin()
        .leftJoin(qConfig.asset)
        .fetchJoin()
        .leftJoin(qConfig.type)
        .fetchJoin()
        .leftJoin(qConfig.billingUnitMaster)
        .fetchJoin()
        .where(
            qConfig.type.id.eq(typeId).and(qConfig.hub.id.eq(hubId)).and(qConfig.active.isTrue()))
        .fetch();
  }

  public List<RentalConfiguration> fetchByTypeId(Long typeId) {
    if (typeId == null) {
      return List.of();
    }
    return queryFactory
        .selectFrom(qConfig)
        .leftJoin(qConfig.hub)
        .fetchJoin()
        .leftJoin(qConfig.asset)
        .fetchJoin()
        .leftJoin(qConfig.type)
        .fetchJoin()
        .leftJoin(qConfig.billingUnitMaster)
        .fetchJoin()
        .where(qConfig.type.id.eq(typeId).and(qConfig.active.isTrue()))
        .fetch();
  }

  public Optional<RentalConfiguration> fetchById(Long id) {
    if (id == null) {
      return Optional.empty();
    }
    return Optional.ofNullable(
        queryFactory
            .selectFrom(qConfig)
            .leftJoin(qConfig.hub)
            .fetchJoin()
            .leftJoin(qConfig.asset)
            .fetchJoin()
            .leftJoin(qConfig.type)
            .fetchJoin()
            .leftJoin(qConfig.billingUnitMaster)
            .fetchJoin()
            .where(qConfig.id.eq(id))
            .fetchOne());
  }
}
