package com.equipgrid.maintenance.repository;

import com.equipgrid.maintenance.entity.MaintenanceDamageComponent;
import com.equipgrid.maintenance.entity.MaintenanceRecord;
import com.equipgrid.maintenance.entity.QMaintenanceDamageComponent;
import com.equipgrid.maintenance.entity.QMaintenanceRecord;
import com.equipgrid.maintenance.enums.MaintenanceStatus;
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
public class MaintenanceQueryRepository {

  private final JPAQueryFactory queryFactory;
  private final QMaintenanceRecord qRecord = QMaintenanceRecord.maintenanceRecord;
  private final QMaintenanceDamageComponent qComponent =
      QMaintenanceDamageComponent.maintenanceDamageComponent;

  public Optional<MaintenanceRecord> fetchByTicketNumber(String ticketNumber) {
    if (ticketNumber == null || ticketNumber.isBlank()) {
      return Optional.empty();
    }
    return Optional.ofNullable(
        queryFactory
            .selectFrom(qRecord)
            .leftJoin(qRecord.asset)
            .fetchJoin()
            .leftJoin(qRecord.hub)
            .fetchJoin()
            .where(qRecord.ticketNumber.eq(ticketNumber.trim()))
            .fetchOne());
  }

  public Optional<MaintenanceRecord> fetchById(Long id) {
    if (id == null) {
      return Optional.empty();
    }
    return Optional.ofNullable(
        queryFactory
            .selectFrom(qRecord)
            .leftJoin(qRecord.asset)
            .fetchJoin()
            .leftJoin(qRecord.hub)
            .fetchJoin()
            .where(qRecord.id.eq(id))
            .fetchOne());
  }

  public List<MaintenanceRecord> fetchRecords(
      Long hubId, MaintenanceStatus status, Boolean activeOnly) {
    BooleanBuilder builder = new BooleanBuilder();
    if (hubId != null) {
      builder.and(qRecord.hub.id.eq(hubId));
    }
    if (status != null) {
      builder.and(qRecord.status.eq(status));
    } else if (Boolean.TRUE.equals(activeOnly)) {
      builder.and(qRecord.status.ne(MaintenanceStatus.COMPLETED));
    }
    return queryFactory
        .selectFrom(qRecord)
        .leftJoin(qRecord.asset)
        .fetchJoin()
        .leftJoin(qRecord.hub)
        .fetchJoin()
        .where(builder)
        .orderBy(qRecord.createdAt.desc())
        .fetch();
  }

  public List<MaintenanceRecord> fetchByAssetId(Long assetId) {
    if (assetId == null) {
      return List.of();
    }
    return queryFactory
        .selectFrom(qRecord)
        .leftJoin(qRecord.asset)
        .fetchJoin()
        .leftJoin(qRecord.hub)
        .fetchJoin()
        .where(qRecord.asset.id.eq(assetId))
        .orderBy(qRecord.createdAt.desc())
        .fetch();
  }

  public long countActiveByHubId(Long hubId, MaintenanceStatus excludedStatus) {
    BooleanBuilder builder = new BooleanBuilder();
    if (hubId != null) {
      builder.and(qRecord.hub.id.eq(hubId));
    }
    if (excludedStatus != null) {
      builder.and(qRecord.status.ne(excludedStatus));
    }
    Long count = queryFactory.select(qRecord.count()).from(qRecord).where(builder).fetchOne();
    return count != null ? count : 0L;
  }

  public long countActive(MaintenanceStatus excludedStatus) {
    BooleanBuilder builder = new BooleanBuilder();
    if (excludedStatus != null) {
      builder.and(qRecord.status.ne(excludedStatus));
    }
    Long count = queryFactory.select(qRecord.count()).from(qRecord).where(builder).fetchOne();
    return count != null ? count : 0L;
  }

  public List<MaintenanceDamageComponent> fetchActiveDamageComponents(Long equipmentTypeId) {
    BooleanBuilder builder = new BooleanBuilder();
    builder.and(qComponent.active.isTrue());
    if (equipmentTypeId != null && equipmentTypeId > 0) {
      builder.and(
          qComponent
              .isUniversal
              .isTrue()
              .or(qComponent.equipmentType.id.eq(equipmentTypeId))
              .or(qComponent.equipmentType.isNull()));
    }
    return queryFactory
        .selectFrom(qComponent)
        .leftJoin(qComponent.equipmentType)
        .fetchJoin()
        .where(builder)
        .orderBy(qComponent.isUniversal.asc(), qComponent.displayOrder.asc(), qComponent.name.asc())
        .fetch();
  }

  public Optional<MaintenanceDamageComponent> fetchDamageComponentByPartCode(String partCode) {
    if (partCode == null || partCode.isBlank()) {
      return Optional.empty();
    }
    return Optional.ofNullable(
        queryFactory
            .selectFrom(qComponent)
            .where(qComponent.partCode.eq(partCode.trim()))
            .fetchFirst());
  }
}
