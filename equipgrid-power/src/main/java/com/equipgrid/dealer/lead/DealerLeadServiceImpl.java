package com.equipgrid.dealer.lead;

import com.equipgrid.common.Exceptions;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class DealerLeadServiceImpl implements IDealerLeadService {

  private final DealerLeadRepository repository;
  private final SecureRandom random = new SecureRandom();

  @Override
  @Transactional
  public DealerLead createLead(CreateDealerLeadRequest request) {
    String leadNumber = String.format("DLR-2026-%06d", random.nextInt(900000) + 100000);

    DealerLead lead =
        DealerLead.builder()
            .leadNumber(leadNumber)
            .name(request.getName().trim())
            .phone(request.getPhone().replaceAll("\\D", ""))
            .businessName(
                request.getBusinessName() != null && !request.getBusinessName().isBlank()
                    ? request.getBusinessName().trim()
                    : null)
            .district(request.getDistrict().trim())
            .fleetCount(request.getFleetCount() != null ? request.getFleetCount().trim() : "1-3")
            .machineCategory(
                request.getMachineCategory() != null ? request.getMachineCategory().trim() : null)
            .status(DealerLeadStatus.ENQUIRY)
            .build();

    DealerLead saved = repository.save(lead);
    log.info(
        "[DealerLead] Created host onboarding lead: {} for phone={}", leadNumber, saved.getPhone());
    return saved;
  }

  @Override
  @Transactional(readOnly = true)
  public List<DealerLead> getAllLeads(DealerLeadStatus status) {
    if (status != null) {
      return repository.findByStatusOrderByCreatedAtDesc(status);
    }
    return repository.findAllByOrderByCreatedAtDesc();
  }

  @Override
  @Transactional(readOnly = true)
  public DealerLead getLeadById(Long id) {
    return repository
        .findById(id)
        .orElseThrow(
            () -> new Exceptions.ResourceNotFoundException("Dealer lead not found with ID: " + id));
  }

  @Override
  @Transactional
  public DealerLead updateStatus(Long id, UpdateDealerLeadStatusRequest request) {
    DealerLead lead = getLeadById(id);

    if (request.getStatus() == DealerLeadStatus.DENIED
        || request.getStatus() == DealerLeadStatus.CLOSED) {
      if (request.getRemarks() == null || request.getRemarks().trim().isBlank()) {
        throw new Exceptions.BusinessRuleViolationException(
            "Remarks are required explaining the reason why this lead is being marked as "
                + request.getStatus());
      }
    }

    lead.setStatus(request.getStatus());
    if (request.getRemarks() != null && !request.getRemarks().isBlank()) {
      lead.setRemarks(request.getRemarks().trim());
    }
    lead.setUpdatedBy(1L);
    lead.setUpdatedAt(LocalDateTime.now());

    DealerLead updated = repository.save(lead);
    log.info(
        "[DealerLead] Lead {} status updated to {} by user {}",
        updated.getLeadNumber(),
        updated.getStatus(),
        updated.getUpdatedBy());
    return updated;
  }
}
