package com.equipgrid.property.repository;

import com.equipgrid.property.entity.DynamicProperty;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence repository for DynamicProperty entity. Read queries are handled in
 * DynamicPropertyQueryRepository (QueryDSL).
 */
@Repository
public interface DynamicPropertyRepository extends JpaRepository<DynamicProperty, Long> {

  boolean existsByKey(String key);
}
