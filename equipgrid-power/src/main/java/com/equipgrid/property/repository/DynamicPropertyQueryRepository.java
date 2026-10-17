package com.equipgrid.property.repository;

import com.equipgrid.property.entity.DynamicProperty;
import com.equipgrid.property.entity.QDynamicProperty;
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
public class DynamicPropertyQueryRepository {

  private final JPAQueryFactory queryFactory;
  private final QDynamicProperty qDynamicProperty = QDynamicProperty.dynamicProperty;

  public Optional<DynamicProperty> fetchByKey(String key) {
    if (key == null || key.isBlank()) {
      return Optional.empty();
    }
    return Optional.ofNullable(
        queryFactory
            .selectFrom(qDynamicProperty)
            .where(qDynamicProperty.key.eq(key.trim()))
            .fetchOne());
  }

  public List<DynamicProperty> fetchAll() {
    return queryFactory.selectFrom(qDynamicProperty).orderBy(qDynamicProperty.id.desc()).fetch();
  }
}
