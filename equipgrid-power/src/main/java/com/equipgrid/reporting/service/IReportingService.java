package com.equipgrid.reporting.service;

import com.equipgrid.reporting.dto.response.*;
import java.time.LocalDate;
import java.util.List;

public interface IReportingService {
  DailyCashReconciliationResponse getDailyCashReconciliation(LocalDate date);

  FleetUtilizationResponse getFleetUtilization();

  DashboardSummaryResponse getDashboardSummary();

  ReportingKpiSummaryResponse getKpiSummary(
      Long stateId, Long cityId, Long hubId, String dateRange);

  List<MachinesOnRentReportItem> getMachinesOnRentReport(
      Long stateId, Long cityId, Long hubId, String dateRange);

  List<CollectionsReportItem> getCollectionsReport(
      Long stateId, Long cityId, Long hubId, String dateRange);

  List<MaintenanceReportItem> getMachinesInMaintenanceReport(Long stateId, Long cityId, Long hubId);

  List<DealerRevenueReportItem> getDealerRevenueReport(
      Long stateId, Long cityId, Long hubId, String dateRange);

  List<FutureBookingReportItem> getFutureBookingsReport(
      Long stateId, Long cityId, Long hubId, String dateRange);

  byte[] exportReportXlsx(
      String reportType, Long stateId, Long cityId, Long hubId, String dateRange);

  byte[] exportMachinesOnRentXlsx(Long stateId, Long cityId, Long hubId, String dateRange);

  byte[] exportCollectionsXlsx(Long stateId, Long cityId, Long hubId, String dateRange);

  byte[] exportMachinesInMaintenanceXlsx(Long stateId, Long cityId, Long hubId);

  byte[] exportDealerRevenueXlsx(Long stateId, Long cityId, Long hubId, String dateRange);

  byte[] exportFutureBookingsXlsx(Long stateId, Long cityId, Long hubId, String dateRange);
}
