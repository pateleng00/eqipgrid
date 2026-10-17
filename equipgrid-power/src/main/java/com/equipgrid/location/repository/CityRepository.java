package com.equipgrid.location.repository;

import com.equipgrid.location.entity.City;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence repository for City entity. Read queries are handled in LocationQueryRepository
 * (QueryDSL).
 */
@Repository
public interface CityRepository extends JpaRepository<City, Long> {}
