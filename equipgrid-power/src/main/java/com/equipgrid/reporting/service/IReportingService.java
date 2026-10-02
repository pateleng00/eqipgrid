package com.equipgrid.reporting.service;

import com.equipgrid.reporting.dto.response.DailyCashReconciliationResponse;
import com.equipgrid.reporting.dto.response.DashboardSummaryResponse;
import com.equipgrid.reporting.dto.response.FleetUtilizationResponse;

import java.time.LocalDate;

public interface IReportingService {
    DailyCashReconciliationResponse getDailyCashReconciliation(LocalDate date);
    FleetUtilizationResponse getFleetUtilization();
    DashboardSummaryResponse getDashboardSummary();
}
