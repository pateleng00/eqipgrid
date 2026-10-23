package com.equipgrid.dealer.lead;

import java.util.List;

public interface IDealerLeadService {
  DealerLead createLead(CreateDealerLeadRequest request);

  List<DealerLead> getAllLeads(DealerLeadStatus status);

  DealerLead getLeadById(Long id);

  DealerLead updateStatus(Long id, UpdateDealerLeadStatusRequest request);
}
