package com.equipgrid.location.repository;

import com.equipgrid.location.entity.Hub;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence repository for Hub entity. Read queries and eager-fetch lookups are handled in
 * LocationQueryRepository (QueryDSL).
 */
@Repository
public interface HubRepository extends JpaRepository<Hub, Long> {}
