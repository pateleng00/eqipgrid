package com.equipgrid.location.repository;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.entity.QAsset;
import com.equipgrid.asset.enums.AssetStatus;
import com.equipgrid.location.entity.*;
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
public class LocationQueryRepository {

  private final JPAQueryFactory queryFactory;
  private final QState qState = QState.state;
  private final QCity qCity = QCity.city;
  private final QHub qHub = QHub.hub;
  private final QAsset qAsset = QAsset.asset;

  public List<State> findActiveStates() {
    return queryFactory
        .selectFrom(qState)
        .where(qState.active.isTrue())
        .orderBy(qState.name.asc())
        .fetch();
  }

  public List<State> findAllStates() {
    return queryFactory.selectFrom(qState).orderBy(qState.name.asc()).fetch();
  }

  public Optional<State> findStateByCode(String code) {
    if (code == null || code.isBlank()) {
      return Optional.empty();
    }
    return Optional.ofNullable(
        queryFactory
            .selectFrom(qState)
            .where(qState.code.equalsIgnoreCase(code.trim()))
            .fetchOne());
  }

  public List<City> findActiveCitiesByStateId(Long stateId) {
    return queryFactory
        .selectFrom(qCity)
        .where(qCity.state.id.eq(stateId).and(qCity.active.isTrue()))
        .orderBy(qCity.name.asc())
        .fetch();
  }

  public List<City> findAllActiveCities() {
    return queryFactory
        .selectFrom(qCity)
        .leftJoin(qCity.state, qState)
        .fetchJoin()
        .where(qCity.active.isTrue())
        .orderBy(qCity.name.asc())
        .fetch();
  }

  public List<City> findAllCities() {
    return queryFactory
        .selectFrom(qCity)
        .leftJoin(qCity.state, qState)
        .fetchJoin()
        .orderBy(qCity.name.asc())
        .fetch();
  }

  public List<Hub> findActiveHubsByCityId(Long cityId) {
    if (cityId == null) {
      return List.of();
    }
    return queryFactory
        .selectFrom(qHub)
        .leftJoin(qHub.city, qCity)
        .fetchJoin()
        .leftJoin(qCity.state, qState)
        .fetchJoin()
        .where(qHub.city.id.eq(cityId).and(qHub.active.isTrue()))
        .orderBy(qHub.name.asc())
        .fetch();
  }

  public List<Hub> findAllActiveHubs() {
    return queryFactory
        .selectFrom(qHub)
        .leftJoin(qHub.city, qCity)
        .fetchJoin()
        .leftJoin(qCity.state, qState)
        .fetchJoin()
        .where(qHub.active.isTrue())
        .orderBy(qHub.name.asc())
        .fetch();
  }

  public List<Hub> findAllHubs() {
    return queryFactory
        .selectFrom(qHub)
        .leftJoin(qHub.city, qCity)
        .fetchJoin()
        .leftJoin(qCity.state, qState)
        .fetchJoin()
        .orderBy(qHub.name.asc())
        .fetch();
  }

  public Optional<Hub> findHubById(Long id) {
    if (id == null) {
      return Optional.empty();
    }
    return Optional.ofNullable(
        queryFactory
            .selectFrom(qHub)
            .leftJoin(qHub.city, qCity)
            .fetchJoin()
            .leftJoin(qCity.state, qState)
            .fetchJoin()
            .where(qHub.id.eq(id))
            .fetchOne());
  }

  public Optional<Hub> findHubByCode(String code) {
    if (code == null || code.isBlank()) {
      return Optional.empty();
    }
    return Optional.ofNullable(
        queryFactory
            .selectFrom(qHub)
            .leftJoin(qHub.city, qCity)
            .fetchJoin()
            .leftJoin(qCity.state, qState)
            .fetchJoin()
            .where(qHub.code.equalsIgnoreCase(code.trim()))
            .fetchOne());
  }

  public List<Asset> findActiveAssetsMappedToHubs() {
    return queryFactory
        .selectFrom(qAsset)
        .where(qAsset.hub.isNotNull().and(qAsset.hub.active.isTrue()))
        .fetch();
  }

  public long countActiveAssetsByHubId(Long hubId) {
    if (hubId == null) {
      return 0L;
    }
    Long count =
        queryFactory
            .select(qAsset.count())
            .from(qAsset)
            .where(qAsset.hub.id.eq(hubId).and(qAsset.status.ne(AssetStatus.RETIRED)))
            .fetchOne();
    return count != null ? count : 0L;
  }

  public long countActiveAssetsByCityId(Long cityId) {
    if (cityId == null) {
      return 0L;
    }
    Long count =
        queryFactory
            .select(qAsset.count())
            .from(qAsset)
            .join(qAsset.hub, qHub)
            .where(qHub.city.id.eq(cityId).and(qAsset.status.ne(AssetStatus.RETIRED)))
            .fetchOne();
    return count != null ? count : 0L;
  }

  public long countActiveAssetsByStateId(Long stateId) {
    if (stateId == null) {
      return 0L;
    }
    Long count =
        queryFactory
            .select(qAsset.count())
            .from(qAsset)
            .join(qAsset.hub, qHub)
            .join(qHub.city, qCity)
            .where(qCity.state.id.eq(stateId).and(qAsset.status.ne(AssetStatus.RETIRED)))
            .fetchOne();
    return count != null ? count : 0L;
  }
}
