package com.equipgrid.support;

import java.util.List;

public interface ISupportTicketService {
  SupportTicket createTicket(CreateSupportTicketRequest request);

  List<SupportTicket> getAllTickets(SupportTicketStatus status);

  SupportTicket getTicketById(Long id);

  SupportTicket updateStatus(Long id, UpdateSupportTicketStatusRequest request);
}
