package com.equipgrid.dealer.lead;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DealerLeadRepository extends JpaRepository<DealerLead, Long> {
  Optional<DealerLead> findByLeadNumber(String leadNumber);

  List<DealerLead> findByStatusOrderByCreatedAtDesc(DealerLeadStatus status);

  List<DealerLead> findAllByOrderByCreatedAtDesc();
}
