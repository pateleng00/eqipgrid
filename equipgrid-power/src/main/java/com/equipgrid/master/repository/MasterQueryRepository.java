package com.equipgrid.master.repository;

import com.equipgrid.master.entity.BillingUnitMaster;
import com.equipgrid.master.entity.EquipmentType;
import com.equipgrid.master.entity.MachineModel;
import com.equipgrid.master.entity.Manufacturer;
import com.equipgrid.master.entity.QBillingUnitMaster;
import com.equipgrid.master.entity.QEquipmentType;
import com.equipgrid.master.entity.QMachineModel;
import com.equipgrid.master.entity.QManufacturer;
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
public class MasterQueryRepository {

  private final JPAQueryFactory queryFactory;
  private final QEquipmentType qType = QEquipmentType.equipmentType;
  private final QManufacturer qMfg = QManufacturer.manufacturer;
  private final QMachineModel qModel = QMachineModel.machineModel;
  private final QBillingUnitMaster qBilling = QBillingUnitMaster.billingUnitMaster;

  // ==================== EQUIPMENT TYPES ====================

  public List<EquipmentType> fetchEquipmentTypes(Boolean includeInactive) {
    BooleanBuilder builder = new BooleanBuilder();
    if (!Boolean.TRUE.equals(includeInactive)) {
      builder.and(qType.active.isTrue());
    }
    return queryFactory.selectFrom(qType).where(builder).orderBy(qType.name.asc()).fetch();
  }

  public Optional<EquipmentType> fetchEquipmentTypeById(Long id) {
    if (id == null) {
      return Optional.empty();
    }
    return Optional.ofNullable(queryFactory.selectFrom(qType).where(qType.id.eq(id)).fetchOne());
  }

  public Optional<EquipmentType> fetchEquipmentTypeByCode(String code) {
    if (code == null || code.isBlank()) {
      return Optional.empty();
    }
    return Optional.ofNullable(
        queryFactory
            .selectFrom(qType)
            .where(qType.code.equalsIgnoreCase(code.trim()))
            .fetchFirst());
  }

  // ==================== MANUFACTURERS ====================

  public List<Manufacturer> fetchManufacturers(Boolean includeInactive) {
    BooleanBuilder builder = new BooleanBuilder();
    if (!Boolean.TRUE.equals(includeInactive)) {
      builder.and(qMfg.active.isTrue());
    }
    return queryFactory.selectFrom(qMfg).where(builder).orderBy(qMfg.name.asc()).fetch();
  }

  public Optional<Manufacturer> fetchManufacturerById(Long id) {
    if (id == null) {
      return Optional.empty();
    }
    return Optional.ofNullable(queryFactory.selectFrom(qMfg).where(qMfg.id.eq(id)).fetchOne());
  }

  // ==================== MACHINE MODELS ====================

  public List<MachineModel> fetchModels(Long typeId, Long manufacturerId, Boolean includeInactive) {
    BooleanBuilder builder = new BooleanBuilder();
    if (!Boolean.TRUE.equals(includeInactive)) {
      builder.and(qModel.active.isTrue());
    }
    if (typeId != null) {
      builder.and(qModel.type.id.eq(typeId));
    }
    if (manufacturerId != null) {
      builder.and(qModel.manufacturer.id.eq(manufacturerId));
    }
    return queryFactory
        .selectFrom(qModel)
        .leftJoin(qModel.type)
        .fetchJoin()
        .leftJoin(qModel.manufacturer)
        .fetchJoin()
        .where(builder)
        .orderBy(qModel.name.asc())
        .fetch();
  }

  public Optional<MachineModel> fetchModelById(Long id) {
    if (id == null) {
      return Optional.empty();
    }
    return Optional.ofNullable(
        queryFactory
            .selectFrom(qModel)
            .leftJoin(qModel.type)
            .fetchJoin()
            .leftJoin(qModel.manufacturer)
            .fetchJoin()
            .where(qModel.id.eq(id))
            .fetchOne());
  }

  // ==================== BILLING UNITS ====================

  public List<BillingUnitMaster> fetchBillingUnits(Boolean activeOnly) {
    BooleanBuilder builder = new BooleanBuilder();
    if (Boolean.TRUE.equals(activeOnly)) {
      builder.and(qBilling.active.isTrue());
    }
    return queryFactory
        .selectFrom(qBilling)
        .where(builder)
        .orderBy(qBilling.displayOrder.asc())
        .fetch();
  }

  public Optional<BillingUnitMaster> fetchBillingUnitByCode(String code) {
    if (code == null || code.isBlank()) {
      return Optional.empty();
    }
    return Optional.ofNullable(
        queryFactory
            .selectFrom(qBilling)
            .where(qBilling.code.equalsIgnoreCase(code.trim()))
            .fetchFirst());
  }
}
