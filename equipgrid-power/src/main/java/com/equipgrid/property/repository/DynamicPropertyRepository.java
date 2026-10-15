package com.equipgrid.property.repository;

import com.equipgrid.property.entity.DynamicProperty;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DynamicPropertyRepository extends JpaRepository<DynamicProperty, Long> {

  Optional<DynamicProperty> findByKey(String key);

  boolean existsByKey(String key);
}
