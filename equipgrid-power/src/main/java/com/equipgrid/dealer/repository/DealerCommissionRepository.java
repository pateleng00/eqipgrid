package com.equipgrid.dealer.repository;

import com.equipgrid.dealer.entity.DealerCommission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence repository for DealerCommission entity.
 * QueryDSL queries are handled in DealerQueryRepository.
 */
@Repository
public interface DealerCommissionRepository extends JpaRepository<DealerCommission, Long> {
}
