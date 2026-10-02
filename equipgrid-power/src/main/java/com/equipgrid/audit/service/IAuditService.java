package com.equipgrid.audit.service;

import com.equipgrid.audit.entity.AuditLog;

import java.util.List;

public interface IAuditService {
    void log(String entityType, String entityId, String action, String performedBy, String details);
    List<AuditLog> getRecentLogs();
}
