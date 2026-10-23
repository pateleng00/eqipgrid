package com.equipgrid.support;

import com.equipgrid.common.dto.rest.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/support-tickets")
@RequiredArgsConstructor
@Tag(
    name = "Customer Support & Inquiries",
    description = "Customer inquiries, callbacks, and machine availability assistance tickets")
public class SupportTicketController {

  private final ISupportTicketService service;

  @PostMapping
  @Operation(summary = "Submit new support inquiry or availability assistance ticket")
  public ResponseEntity<ApiResponse<SupportTicket>> createTicket(
      @Valid @RequestBody CreateSupportTicketRequest request) {
    SupportTicket saved = service.createTicket(request);
    return ResponseEntity.ok(
        ApiResponse.buildSuccess("SG-200", "Support ticket registered", saved));
  }

  @GetMapping
  @Operation(summary = "Get all support tickets for station desk review")
  public ResponseEntity<ApiResponse<List<SupportTicket>>> getAllTickets(
      @RequestParam(required = false) SupportTicketStatus status) {
    return ResponseEntity.ok(ApiResponse.buildSuccess(service.getAllTickets(status)));
  }

  @GetMapping("/{id}")
  @Operation(summary = "Get support ticket by ID")
  public ResponseEntity<ApiResponse<SupportTicket>> getTicketById(@PathVariable Long id) {
    return ResponseEntity.ok(ApiResponse.buildSuccess(service.getTicketById(id)));
  }

  @PatchMapping("/{id}/status")
  @Operation(summary = "Update support ticket status (remarks required for RESOLVED or CLOSED)")
  public ResponseEntity<ApiResponse<SupportTicket>> updateStatus(
      @PathVariable Long id,
      @Valid @RequestBody UpdateSupportTicketStatusRequest request,
      Principal principal) {
    if (principal != null
        && (request.getResolvedBy() == null || request.getResolvedBy().isBlank())) {
      request.setResolvedBy(principal.getName());
    }
    SupportTicket updated = service.updateStatus(id, request);
    return ResponseEntity.ok(ApiResponse.buildSuccess("SG-200", "Ticket status updated", updated));
  }
}
