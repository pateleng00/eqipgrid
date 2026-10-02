package com.equipgrid.dealer.repository;

import com.equipgrid.dealer.entity.Dealer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence repository for Dealer entity.
 * Read queries and commission tracking are in DealerQueryRepository (QueryDSL).
 */
@Repository
public interface DealerRepository extends JpaRepository<Dealer, Long> {
}
