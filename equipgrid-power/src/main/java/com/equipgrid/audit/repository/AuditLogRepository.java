package com.equipgrid.audit.repository;

import com.equipgrid.audit.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence repository for AuditLog entity.
 * QueryDSL queries are handled in AuditLogQueryRepository.
 */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
}
