package com.equipgrid.dispatch.controller;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.dispatch.dto.request.CreateDispatchRequest;
import com.equipgrid.dispatch.entity.DispatchRecord;
import com.equipgrid.dispatch.service.IDispatchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/dispatch")
@Tag(name = "Yard Dispatch & Outward Challan", description = "SOP-005 Outward challan, checklists, zero-credit barrier check")
public class DispatchController {

    private final IDispatchService dispatchService;

    public DispatchController(IDispatchService dispatchService) {
        this.dispatchService = dispatchService;
    }

    @GetMapping("/booking/{bookingId}")
    @Operation(summary = "Get dispatch handover record by booking ID")
    public ResponseEntity<ApiResponse<DispatchRecord>> getByBookingId(@PathVariable Long bookingId) {
        return ResponseEntity.ok(ApiResponse.buildSuccess(dispatchService.getByBookingId(bookingId)));
    }

    @PostMapping
    @Operation(summary = "Execute yard dispatch, issue challan, and transition asset to ON_RENT (Enforces Zero-Credit Rule)")
    public ResponseEntity<ApiResponse<DispatchRecord>> executeDispatch(
            @Valid @RequestBody CreateDispatchRequest request,
            Principal principal) {
        String actor = principal != null ? principal.getName() : "YARD_DISPATCH";
        DispatchRecord record = dispatchService.executeDispatch(request, actor);
        return ResponseEntity.ok(ApiResponse.buildSuccess("Asset dispatched and outward challan issued", record));
    }
}
