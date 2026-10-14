package com.equipgrid.location.repository;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.entity.QAsset;
import com.equipgrid.location.entity.City;
import com.equipgrid.location.entity.Hub;
import com.equipgrid.location.entity.QCity;
import com.equipgrid.location.entity.QHub;
import com.equipgrid.location.entity.QState;
import com.equipgrid.location.entity.State;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

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
        return queryFactory.selectFrom(qState)
                .where(qState.active.isTrue())
                .orderBy(qState.name.asc())
                .fetch();
    }

    public List<City> findActiveCitiesByStateId(Long stateId) {
        return queryFactory.selectFrom(qCity)
                .where(qCity.state.id.eq(stateId).and(qCity.active.isTrue()))
                .orderBy(qCity.name.asc())
                .fetch();
    }

    public List<City> findAllActiveCities() {
        return queryFactory.selectFrom(qCity)
                .where(qCity.active.isTrue())
                .orderBy(qCity.name.asc())
                .fetch();
    }

    public List<Hub> findActiveHubsByCityId(Long cityId) {
        return queryFactory.selectFrom(qHub)
                .where(qHub.city.id.eq(cityId).and(qHub.active.isTrue()))
                .orderBy(qHub.name.asc())
                .fetch();
    }

    public List<Hub> findAllActiveHubs() {
        return queryFactory.selectFrom(qHub)
                .where(qHub.active.isTrue())
                .orderBy(qHub.name.asc())
                .fetch();
    }

    public List<Asset> findActiveAssetsMappedToHubs() {
        return queryFactory.selectFrom(qAsset)
                .where(qAsset.hub.isNotNull()
                        .and(qAsset.hub.active.isTrue()))
                .fetch();
    }
}
