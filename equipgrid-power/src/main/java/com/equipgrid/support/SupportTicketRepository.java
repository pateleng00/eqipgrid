package com.equipgrid.support;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {
  Optional<SupportTicket> findByTicketNumber(String ticketNumber);

  List<SupportTicket> findByStatusOrderByCreatedAtDesc(SupportTicketStatus status);

  List<SupportTicket> findAllByOrderByCreatedAtDesc();

  List<SupportTicket> findByCustomerPhoneOrderByCreatedAtDesc(String customerPhone);
}
