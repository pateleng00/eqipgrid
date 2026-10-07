package com.equipgrid.asset.repository;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.entity.QAsset;
import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.asset.enums.AssetStatus;
import com.querydsl.core.BooleanBuilder;
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
public class AssetQueryRepository {

    private final JPAQueryFactory queryFactory;
    private final QAsset qAsset = QAsset.asset;

    public List<Asset> fetchAssets(AssetCategory category, AssetStatus status) {
        BooleanBuilder builder = new BooleanBuilder();
        if (category != null) {
            builder.and(qAsset.category.eq(category));
        }
        if (status != null) {
            builder.and(qAsset.status.eq(status));
        }
        return queryFactory.selectFrom(qAsset)
                .where(builder)
                .fetch();
    }

    public Optional<Asset> fetchById(Long id) {
        if (id == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(
                queryFactory.selectFrom(qAsset)
                        .where(qAsset.id.eq(id))
                        .fetchOne()
        );
    }

    public Optional<Asset> fetchByAssetTag(String tag) {
        if (tag == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(
                queryFactory.selectFrom(qAsset)
                        .where(qAsset.assetTag.equalsIgnoreCase(tag.trim()))
                        .fetchOne()
        );
    }

    public boolean existsByAssetTag(String tag) {
        if (tag == null) {
            return false;
        }
        Integer count = queryFactory.selectOne()
                .from(qAsset)
                .where(qAsset.assetTag.equalsIgnoreCase(tag.trim()))
                .fetchFirst();
        return count != null;
    }

    public List<Asset> fetchOperationalMachinesByType(Long typeId, String name, Long hubId) {
        BooleanBuilder builder = new BooleanBuilder();
        builder.and(qAsset.status.notIn(AssetStatus.RETIRED, AssetStatus.DAMAGED));

        if (typeId != null) {
            builder.and(qAsset.type.id.eq(typeId));
        } else if (name != null && !name.isBlank()) {
            builder.and(qAsset.name.equalsIgnoreCase(name.trim()));
        }

        if (hubId != null) {
            builder.and(qAsset.hub.id.eq(hubId));
        }

        return queryFactory.selectFrom(qAsset)
                .where(builder)
                .fetch();
    }

    public long countOperationalMachinesByType(Long typeId, String name, Long hubId) {
        return fetchOperationalMachinesByType(typeId, name, hubId).size();
    }
}
