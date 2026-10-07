package com.equipgrid.reporting.controller;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.reporting.dto.response.DailyCashReconciliationResponse;
import com.equipgrid.reporting.dto.response.DashboardSummaryResponse;
import com.equipgrid.reporting.dto.response.FleetUtilizationResponse;
import com.equipgrid.reporting.service.IReportingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/reports")
@Tag(name = "Reports & Operations KPI", description = "SOP-015 Daily cash reconciliation and fleet utilization metrics")
public class ReportingController {

    private final IReportingService reportingService;

    public ReportingController(IReportingService reportingService) {
        this.reportingService = reportingService;
    }

    @GetMapping("/dashboard-summary")
    @Operation(summary = "Get high-level operational overview and compliance rate")
    public ResponseEntity<ApiResponse<DashboardSummaryResponse>> getDashboardSummary() {
        return ResponseEntity.ok(ApiResponse.buildSuccess(reportingService.getDashboardSummary()));
    }

    @GetMapping("/daily-cash")
    @Operation(summary = "SOP-015: Daily Cash Reconciliation (Opening + UPI + Cash - Expenses = Closing)")
    public ResponseEntity<ApiResponse<DailyCashReconciliationResponse>> getDailyCashReconciliation(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.buildSuccess(reportingService.getDailyCashReconciliation(date)));
    }

    @GetMapping("/fleet-utilization")
    @Operation(summary = "Fleet Utilization Metrics: Total, On Rent, Available, Maintenance, %")
    public ResponseEntity<ApiResponse<FleetUtilizationResponse>> getFleetUtilization() {
        return ResponseEntity.ok(ApiResponse.buildSuccess(reportingService.getFleetUtilization()));
    }
}
