package com.equipgrid.dealer.lead;

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
@RequestMapping("/dealer-leads")
@RequiredArgsConstructor
@Tag(
    name = "Dealer Onboarding Leads",
    description = "Host machinery onboarding inquiries from website and station desk")
public class DealerLeadController {

  private final IDealerLeadService service;

  @PostMapping
  @Operation(summary = "Submit new machinery host onboarding lead from website")
  public ResponseEntity<ApiResponse<DealerLead>> createLead(
      @Valid @RequestBody CreateDealerLeadRequest request) {
    DealerLead saved = service.createLead(request);
    return ResponseEntity.ok(
        ApiResponse.buildSuccess("SG-200", "Dealer onboarding application registered", saved));
  }

  @GetMapping
  @Operation(summary = "Get all host onboarding leads for station desk review")
  public ResponseEntity<ApiResponse<List<DealerLead>>> getAllLeads(
      @RequestParam(required = false) DealerLeadStatus status) {
    return ResponseEntity.ok(ApiResponse.buildSuccess(service.getAllLeads(status)));
  }

  @GetMapping("/{id}")
  @Operation(summary = "Get dealer lead by ID")
  public ResponseEntity<ApiResponse<DealerLead>> getLeadById(@PathVariable Long id) {
    return ResponseEntity.ok(ApiResponse.buildSuccess(service.getLeadById(id)));
  }

  @PatchMapping("/{id}/status")
  @Operation(summary = "Update lead review status (remarks required for DENIED or CLOSED)")
  public ResponseEntity<ApiResponse<DealerLead>> updateStatus(
      @PathVariable Long id,
      @Valid @RequestBody UpdateDealerLeadStatusRequest request,
      Principal principal) {
    if (principal != null
        && (request.getReviewedBy() == null || request.getReviewedBy().isBlank())) {
      request.setReviewedBy(principal.getName());
    }
    DealerLead updated = service.updateStatus(id, request);
    return ResponseEntity.ok(ApiResponse.buildSuccess("SG-200", "Lead status updated", updated));
  }
}
