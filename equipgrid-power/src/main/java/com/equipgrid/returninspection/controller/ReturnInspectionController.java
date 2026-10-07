package com.equipgrid.returninspection.controller;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.returninspection.dto.request.CreateInspectionRequest;
import com.equipgrid.returninspection.dto.response.SettlementCalculationResponse;
import com.equipgrid.returninspection.entity.ReturnInspection;
import com.equipgrid.returninspection.service.IReturnInspectionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/returns")
@Tag(name = "Return Inspection & Damage Audit", description = "SOP-008 Post-rental return inspection, damage logging and deposit refund calculation")
public class ReturnInspectionController {

    private final IReturnInspectionService returnInspectionService;

    public ReturnInspectionController(IReturnInspectionService returnInspectionService) {
        this.returnInspectionService = returnInspectionService;
    }

    @GetMapping("/booking/{bookingId}")
    @Operation(summary = "Get all return inspections for a booking")
    public ResponseEntity<ApiResponse<List<ReturnInspection>>> getByBookingId(@PathVariable Long bookingId) {
        return ResponseEntity.ok(ApiResponse.buildSuccess(returnInspectionService.getInspectionsByBooking(bookingId)));
    }

    @GetMapping("/booking/{bookingId}/settlement")
    @Operation(summary = "Calculate net refundable deposit after damage and fuel deductions")
    public ResponseEntity<ApiResponse<SettlementCalculationResponse>> getSettlement(@PathVariable Long bookingId) {
        return ResponseEntity.ok(ApiResponse.buildSuccess(returnInspectionService.calculateDepositSettlement(bookingId)));
    }

    @PostMapping
    @Operation(summary = "Submit physical return inspection and release or route machine to maintenance")
    public ResponseEntity<ApiResponse<ReturnInspection>> executeInspection(
            @Valid @RequestBody CreateInspectionRequest request,
            Principal principal) {
        String actor = principal != null ? principal.getName() : "INSPECTION_STAFF";
        ReturnInspection inspection = returnInspectionService.executeInspection(request, actor);
        return ResponseEntity.ok(ApiResponse.buildSuccess("Return inspection completed successfully", inspection));
    }
}
