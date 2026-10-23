package com.equipgrid.reporting.controller;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.reporting.dto.response.*;
import com.equipgrid.reporting.service.IReportingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/reports")
@Tag(
    name = "Reports & Analytics Module",
    description = "Operational reports, KPI cards, and downloadable audit analytics")
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
  @Operation(
      summary = "SOP-015: Daily Cash Reconciliation (Opening + UPI + Cash - Expenses = Closing)")
  public ResponseEntity<ApiResponse<DailyCashReconciliationResponse>> getDailyCashReconciliation(
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
          LocalDate date) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(reportingService.getDailyCashReconciliation(date)));
  }

  @GetMapping("/fleet-utilization")
  @Operation(summary = "Fleet Utilization Metrics: Total, On Rent, Available, Maintenance, %")
  public ResponseEntity<ApiResponse<FleetUtilizationResponse>> getFleetUtilization() {
    return ResponseEntity.ok(ApiResponse.buildSuccess(reportingService.getFleetUtilization()));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORTING KPI CARDS & MODAL DETAIL APIS
  // ═══════════════════════════════════════════════════════════════════════════

  @GetMapping("/kpis")
  @Operation(
      summary = "Get summary metrics for all 5 reporting KPI cards based on filter parameters")
  public ResponseEntity<ApiResponse<ReportingKpiSummaryResponse>> getKpiSummary(
      @RequestParam(required = false) Long stateId,
      @RequestParam(required = false) Long cityId,
      @RequestParam(required = false) Long hubId,
      @RequestParam(required = false, defaultValue = "today") String dateRange) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            reportingService.getKpiSummary(stateId, cityId, hubId, dateRange)));
  }

  @GetMapping("/machines-on-rent")
  @Operation(summary = "Total Machines on Rent detailed listing")
  public ResponseEntity<ApiResponse<List<MachinesOnRentReportItem>>> getMachinesOnRentReport(
      @RequestParam(required = false) Long stateId,
      @RequestParam(required = false) Long cityId,
      @RequestParam(required = false) Long hubId,
      @RequestParam(required = false, defaultValue = "today") String dateRange) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            reportingService.getMachinesOnRentReport(stateId, cityId, hubId, dateRange)));
  }

  @GetMapping("/collections")
  @Operation(summary = "Total Collections detailed payment receipt records")
  public ResponseEntity<ApiResponse<List<CollectionsReportItem>>> getCollectionsReport(
      @RequestParam(required = false) Long stateId,
      @RequestParam(required = false) Long cityId,
      @RequestParam(required = false) Long hubId,
      @RequestParam(required = false, defaultValue = "today") String dateRange) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            reportingService.getCollectionsReport(stateId, cityId, hubId, dateRange)));
  }

  @GetMapping("/machines-in-maintenance")
  @Operation(
      summary = "Machines in Maintenance detailed listing (Only State, City, Hub filters apply)")
  public ResponseEntity<ApiResponse<List<MaintenanceReportItem>>> getMachinesInMaintenanceReport(
      @RequestParam(required = false) Long stateId,
      @RequestParam(required = false) Long cityId,
      @RequestParam(required = false) Long hubId) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            reportingService.getMachinesInMaintenanceReport(stateId, cityId, hubId)));
  }

  @GetMapping("/dealers-revenue")
  @Operation(summary = "Dealer Revenue & Commission detailed breakdown")
  public ResponseEntity<ApiResponse<List<DealerRevenueReportItem>>> getDealerRevenueReport(
      @RequestParam(required = false) Long stateId,
      @RequestParam(required = false) Long cityId,
      @RequestParam(required = false) Long hubId,
      @RequestParam(required = false, defaultValue = "today") String dateRange) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            reportingService.getDealerRevenueReport(stateId, cityId, hubId, dateRange)));
  }

  @GetMapping("/future-bookings")
  @Operation(summary = "Future Bookings (starting from tomorrow onwards) detailed listing")
  public ResponseEntity<ApiResponse<List<FutureBookingReportItem>>> getFutureBookingsReport(
      @RequestParam(required = false) Long stateId,
      @RequestParam(required = false) Long cityId,
      @RequestParam(required = false) Long hubId,
      @RequestParam(required = false, defaultValue = "today") String dateRange) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            reportingService.getFutureBookingsReport(stateId, cityId, hubId, dateRange)));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEPARATE DOWNLOAD EXCEL (.xlsx) APIS FOR EACH REPORT
  // ═══════════════════════════════════════════════════════════════════════════

  @GetMapping("/machines-on-rent/download-excel")
  @Operation(summary = "Total Machines on Rent Excel (.xlsx) workbook")
  public ResponseEntity<byte[]> downloadMachinesOnRentExcel(
      @RequestParam(required = false) Long stateId,
      @RequestParam(required = false) Long cityId,
      @RequestParam(required = false) Long hubId,
      @RequestParam(required = false, defaultValue = "today") String dateRange) {

    byte[] excelBytes =
        reportingService.exportMachinesOnRentXlsx(stateId, cityId, hubId, dateRange);
    String filename =
        String.format("EquipGrid_Machines_On_Rent_%s_%s.xlsx", dateRange, LocalDate.now());

    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
        .contentType(
            MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
        .body(excelBytes);
  }

  @GetMapping("/collections/download-excel")
  @Operation(summary = "Collections & Receipts Ledger Excel (.xlsx) workbook")
  public ResponseEntity<byte[]> downloadCollectionsExcel(
      @RequestParam(required = false) Long stateId,
      @RequestParam(required = false) Long cityId,
      @RequestParam(required = false) Long hubId,
      @RequestParam(required = false, defaultValue = "today") String dateRange) {

    byte[] excelBytes = reportingService.exportCollectionsXlsx(stateId, cityId, hubId, dateRange);
    String filename = String.format("EquipGrid_Collections_%s_%s.xlsx", dateRange, LocalDate.now());

    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
        .contentType(
            MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
        .body(excelBytes);
  }

  @GetMapping("/machines-in-maintenance/download-excel")
  @Operation(summary = "Machines in Maintenance Excel (.xlsx) workbook (State/City/Hub only)")
  public ResponseEntity<byte[]> downloadMachinesInMaintenanceExcel(
      @RequestParam(required = false) Long stateId,
      @RequestParam(required = false) Long cityId,
      @RequestParam(required = false) Long hubId) {

    byte[] excelBytes = reportingService.exportMachinesInMaintenanceXlsx(stateId, cityId, hubId);
    String filename = String.format("EquipGrid_Maintenance_Live_%s.xlsx", LocalDate.now());

    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
        .contentType(
            MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
        .body(excelBytes);
  }

  @GetMapping("/dealers-revenue/download-excel")
  @Operation(summary = "Dealer Revenue & Commissions Excel (.xlsx) workbook")
  public ResponseEntity<byte[]> downloadDealerRevenueExcel(
      @RequestParam(required = false) Long stateId,
      @RequestParam(required = false) Long cityId,
      @RequestParam(required = false) Long hubId,
      @RequestParam(required = false, defaultValue = "today") String dateRange) {

    byte[] excelBytes = reportingService.exportDealerRevenueXlsx(stateId, cityId, hubId, dateRange);
    String filename =
        String.format("EquipGrid_Dealers_Revenue_%s_%s.xlsx", dateRange, LocalDate.now());

    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
        .contentType(
            MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
        .body(excelBytes);
  }

  @GetMapping("/future-bookings/download-excel")
  @Operation(summary = "Future Bookings Schedule Excel (.xlsx) workbook")
  public ResponseEntity<byte[]> downloadFutureBookingsExcel(
      @RequestParam(required = false) Long stateId,
      @RequestParam(required = false) Long cityId,
      @RequestParam(required = false) Long hubId,
      @RequestParam(required = false, defaultValue = "today") String dateRange) {

    byte[] excelBytes =
        reportingService.exportFutureBookingsXlsx(stateId, cityId, hubId, dateRange);
    String filename =
        String.format("EquipGrid_Future_Bookings_%s_%s.xlsx", dateRange, LocalDate.now());

    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
        .contentType(
            MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
        .body(excelBytes);
  }
}
