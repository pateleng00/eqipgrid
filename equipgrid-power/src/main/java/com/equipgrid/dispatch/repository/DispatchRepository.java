package com.equipgrid.dispatch.repository;

import com.equipgrid.dispatch.entity.DispatchRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence repository for DispatchRecord entity.
 * QueryDSL operations are handled in DispatchQueryRepository.
 */
@Repository
public interface DispatchRepository extends JpaRepository<DispatchRecord, Long> {
}
