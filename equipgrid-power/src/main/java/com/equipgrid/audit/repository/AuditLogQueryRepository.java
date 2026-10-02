package com.equipgrid.audit.repository;

import com.equipgrid.audit.entity.AuditLog;
import com.equipgrid.audit.entity.QAuditLog;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Repository
@AllArgsConstructor
@Transactional(readOnly = true)
public class AuditLogQueryRepository {

    private final JPAQueryFactory queryFactory;
    private final QAuditLog qAuditLog = QAuditLog.auditLog;

    public List<AuditLog> fetchRecentLogs(int limit) {
        return queryFactory.selectFrom(qAuditLog)
                .orderBy(qAuditLog.createdAt.desc())
                .limit(limit > 0 ? limit : 50)
                .fetch();
    }
}
