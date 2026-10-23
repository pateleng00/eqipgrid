package com.equipgrid.support;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.repository.AssetRepository;
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
public class SupportTicketServiceImpl implements ISupportTicketService {

  private final SupportTicketRepository repository;
  private final AssetRepository assetRepository;
  private final SecureRandom random = new SecureRandom();

  @Override
  @Transactional
  public SupportTicket createTicket(CreateSupportTicketRequest request) {
    String ticketNumber = String.format("TCK-2026-%06d", random.nextInt(900000) + 100000);

    Asset asset = null;
    String assetName = request.getAssetName();
    if (request.getAssetId() != null) {
      asset = assetRepository.findById(request.getAssetId()).orElse(null);
      if (asset != null && (assetName == null || assetName.isBlank())) {
        assetName = asset.getName();
      }
    }

    SupportTicket ticket =
        SupportTicket.builder()
            .ticketNumber(ticketNumber)
            .customerName(request.getCustomerName().trim())
            .customerPhone(request.getCustomerPhone().replaceAll("\\D", ""))
            .topic(request.getTopic().trim())
            .message(request.getMessage() != null ? request.getMessage().trim() : null)
            .district(request.getDistrict() != null ? request.getDistrict().trim() : null)
            .asset(asset)
            .assetName(assetName)
            .rentalStartDate(request.getRentalStartDate())
            .rentalEndDate(request.getRentalEndDate())
            .status(SupportTicketStatus.OPEN)
            .priority(
                request.getPriority() != null
                    ? request.getPriority()
                    : SupportTicketPriority.NORMAL)
            .build();

    SupportTicket saved = repository.save(ticket);
    log.info(
        "[SupportTicket] Created inquiry ticket: {} topic={} for customer={}",
        ticketNumber,
        saved.getTopic(),
        saved.getCustomerPhone());
    return saved;
  }

  @Override
  @Transactional(readOnly = true)
  public List<SupportTicket> getAllTickets(SupportTicketStatus status) {
    if (status != null) {
      return repository.findByStatusOrderByCreatedAtDesc(status);
    }
    return repository.findAllByOrderByCreatedAtDesc();
  }

  @Override
  @Transactional(readOnly = true)
  public SupportTicket getTicketById(Long id) {
    return repository
        .findById(id)
        .orElseThrow(
            () ->
                new Exceptions.ResourceNotFoundException(
                    "Support ticket not found with ID: " + id));
  }

  @Override
  @Transactional
  public SupportTicket updateStatus(Long id, UpdateSupportTicketStatusRequest request) {
    SupportTicket ticket = getTicketById(id);

    if (request.getStatus() == SupportTicketStatus.CLOSED
        || request.getStatus() == SupportTicketStatus.RESOLVED) {
      if (request.getRemarks() == null || request.getRemarks().trim().isBlank()) {
        throw new Exceptions.BusinessRuleViolationException(
            "Remarks are required explaining the resolution or reason for closing ticket "
                + ticket.getTicketNumber());
      }
    }

    ticket.setStatus(request.getStatus());
    if (request.getRemarks() != null && !request.getRemarks().isBlank()) {
      ticket.setRemarks(request.getRemarks().trim());
    }
    if (request.getAssignedTo() != null && !request.getAssignedTo().isBlank()) {
      ticket.setAssignedTo(request.getAssignedTo().trim());
    }
    if (request.getStatus() == SupportTicketStatus.RESOLVED
        || request.getStatus() == SupportTicketStatus.CLOSED) {
      ticket.setResolvedBy(
          request.getResolvedBy() != null ? request.getResolvedBy().trim() : "STATION_SUPPORT");
      ticket.setResolvedAt(LocalDateTime.now());
    }

    SupportTicket updated = repository.save(ticket);
    log.info(
        "[SupportTicket] Ticket {} updated to status={}",
        updated.getTicketNumber(),
        updated.getStatus());
    return updated;
  }
}
