package com.equipgrid.audit.service;

import com.equipgrid.audit.entity.AuditLog;
import com.equipgrid.audit.repository.AuditLogQueryRepository;
import com.equipgrid.audit.repository.AuditLogRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@AllArgsConstructor
public class AuditServiceImpl implements IAuditService {

    private final AuditLogRepository auditLogRepository;
    private final AuditLogQueryRepository auditLogQueryRepository;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String entityType, String entityId, String action, String performedBy, String details) {
        AuditLog entry = AuditLog.builder()
                .entityType(entityType)
                .entityId(entityId)
                .action(action)
                .performedBy(performedBy)
                .details(details)
                .build();
        auditLogRepository.save(entry);
    }

    @Override
    public List<AuditLog> getRecentLogs() {
        return auditLogQueryRepository.fetchRecentLogs(50);
    }
}
