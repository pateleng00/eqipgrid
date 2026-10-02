package com.equipgrid.returninspection.repository;

import com.equipgrid.returninspection.entity.ReturnInspection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence repository for ReturnInspection entity.
 * QueryDSL inspection lookups are in ReturnInspectionQueryRepository.
 */
@Repository
public interface ReturnInspectionRepository extends JpaRepository<ReturnInspection, Long> {
}
