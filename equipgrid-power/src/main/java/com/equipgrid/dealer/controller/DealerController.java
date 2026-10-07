package com.equipgrid.dealer.controller;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.dealer.dto.request.CreateDealerRequest;
import com.equipgrid.dealer.dto.response.DealerSummaryResponse;
import com.equipgrid.dealer.entity.Dealer;
import com.equipgrid.dealer.entity.DealerCommission;
import com.equipgrid.dealer.service.IDealerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/dealers")
@Tag(name = "Dealer & Channel Partners", description = "SOP-006 Channel partner network and 6% commission tracking")
public class DealerController {

    private final IDealerService dealerService;

    public DealerController(IDealerService dealerService) {
        this.dealerService = dealerService;
    }

    @GetMapping
    @Operation(summary = "List all partner dealers with referral performance")
    public ResponseEntity<ApiResponse<List<DealerSummaryResponse>>> getAllDealers() {
        return ResponseEntity.ok(ApiResponse.buildSuccess(dealerService.getAllDealers()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get dealer details by ID")
    public ResponseEntity<ApiResponse<Dealer>> getDealerById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.buildSuccess(dealerService.getDealerById(id)));
    }

    @GetMapping("/{id}/commissions")
    @Operation(summary = "Get referral commissions for a specific dealer")
    public ResponseEntity<ApiResponse<List<DealerCommission>>> getDealerCommissions(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.buildSuccess(dealerService.getCommissionsByDealer(id)));
    }

    @PostMapping
    @Operation(summary = "Onboard a new dealer / shop partner")
    public ResponseEntity<ApiResponse<Dealer>> createDealer(
            @Valid @RequestBody CreateDealerRequest request,
            Principal principal) {
        String actor = principal != null ? principal.getName() : "ADMIN";
        Dealer saved = dealerService.createDealer(request, actor);
        return ResponseEntity.ok(ApiResponse.buildSuccess("SG-200", "Dealer onboarded successfully", saved));
    }

    @PatchMapping("/commissions/{commissionId}/settle")
    @Operation(summary = "Mark referral commission as settled/paid")
    public ResponseEntity<ApiResponse<DealerCommission>> settleCommission(
            @PathVariable Long commissionId,
            Principal principal) {
        String actor = principal != null ? principal.getName() : "ACCOUNTS";
        DealerCommission settled = dealerService.settleCommission(commissionId, actor);
        return ResponseEntity.ok(ApiResponse.buildSuccess("SG-200", "Commission settled", settled));
    }
}
