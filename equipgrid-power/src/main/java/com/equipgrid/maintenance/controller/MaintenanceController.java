package com.equipgrid.maintenance.controller;

import com.equipgrid.auth.entity.User;
import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.core.ratelimiter.RateLimited;
import com.equipgrid.maintenance.dto.CompleteMaintenanceRequest;
import com.equipgrid.maintenance.dto.CreateMaintenanceRequest;
import com.equipgrid.maintenance.dto.MaintenanceRecordResponse;
import com.equipgrid.maintenance.dto.UpdateMaintenanceProgressRequest;
import com.equipgrid.maintenance.entity.MaintenanceDamageComponent;
import com.equipgrid.maintenance.enums.MaintenanceStatus;
import com.equipgrid.maintenance.service.IMaintenanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/maintenance")
@RequiredArgsConstructor
@Tag(
    name = "Maintenance & Servicing",
    description =
        "Fleet repair, servicing orders, in-house/external workshop management and invoicing")
public class MaintenanceController {

  private final IMaintenanceService maintenanceService;

  @PostMapping("/tickets")
  @Operation(
      summary = "Create maintenance / repair ticket",
      description =
          "Moves a machine into In-House or External Service Center, updates asset status to MAINTENANCE/DAMAGED, locking it out of bookings.")
  public ResponseEntity<ApiResponse<MaintenanceRecordResponse>> createTicket(
      @Valid @RequestBody CreateMaintenanceRequest request,
      @AuthenticationPrincipal User currentUser) {
    Long userId = currentUser != null ? currentUser.getId() : null;
    MaintenanceRecordResponse response =
        maintenanceService.createMaintenanceRecord(request, userId);
    return ResponseEntity.ok(ApiResponse.buildSuccess("Maintenance ticket created", response));
  }

  @GetMapping("/tickets")
  @Operation(
      summary = "List maintenance tickets",
      description = "Lists repair and service orders filtered by hub, status, or active status.")
  public ResponseEntity<ApiResponse<List<MaintenanceRecordResponse>>> listTickets(
      @RequestParam(required = false) Long hubId,
      @RequestParam(required = false) MaintenanceStatus status,
      @RequestParam(required = false, defaultValue = "false") Boolean activeOnly) {
    List<MaintenanceRecordResponse> records =
        maintenanceService.getMaintenanceRecords(hubId, status, activeOnly);
    return ResponseEntity.ok(ApiResponse.buildSuccess(records));
  }

  @GetMapping("/tickets/{id}")
  @Operation(summary = "Get maintenance ticket by ID")
  public ResponseEntity<ApiResponse<MaintenanceRecordResponse>> getTicket(@PathVariable Long id) {
    MaintenanceRecordResponse response = maintenanceService.getMaintenanceRecordById(id);
    return ResponseEntity.ok(ApiResponse.buildSuccess(response));
  }

  @PatchMapping("/tickets/{id}/progress")
  @Operation(summary = "Update ticket progress, expected date, work scope, or technician notes")
  public ResponseEntity<ApiResponse<MaintenanceRecordResponse>> updateProgress(
      @PathVariable Long id,
      @RequestBody UpdateMaintenanceProgressRequest request,
      @AuthenticationPrincipal User currentUser) {
    Long userId = currentUser != null ? currentUser.getId() : null;
    MaintenanceRecordResponse response =
        maintenanceService.updateMaintenanceProgress(id, request, userId);
    return ResponseEntity.ok(ApiResponse.buildSuccess("Progress updated successfully", response));
  }

  @PostMapping(value = "/tickets/{id}/invoice", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @RateLimited(limit = 20, name = "maintenance_invoice_upload")
  @Operation(
      summary = "Upload external service center bill / invoice",
      description = "Uploads a PDF, JPG, or PNG workshop invoice to S3 and links it to the ticket.")
  public ResponseEntity<ApiResponse<MaintenanceRecordResponse>> uploadInvoice(
      @PathVariable Long id,
      @RequestPart("file") MultipartFile file,
      @AuthenticationPrincipal User currentUser) {
    Long userId = currentUser != null ? currentUser.getId() : null;
    MaintenanceRecordResponse response =
        maintenanceService.uploadMaintenanceInvoice(id, file, userId);
    return ResponseEntity.ok(
        ApiResponse.buildSuccess("Invoice document uploaded successfully", response));
  }

  @PostMapping("/tickets/{id}/complete")
  @Operation(
      summary = "Complete service & release machinery",
      description =
          "Certifies maintenance completion, records actual costs and invoice number, and releases machine status back to AVAILABLE.")
  public ResponseEntity<ApiResponse<MaintenanceRecordResponse>> completeService(
      @PathVariable Long id,
      @RequestBody CompleteMaintenanceRequest request,
      @AuthenticationPrincipal User currentUser) {
    Long userId = currentUser != null ? currentUser.getId() : null;
    MaintenanceRecordResponse response =
        maintenanceService.completeMaintenanceRecord(id, request, userId);
    return ResponseEntity.ok(
        ApiResponse.buildSuccess("Machine released to AVAILABLE fleet successfully", response));
  }

  @GetMapping("/assets/{assetId}/history")
  @Operation(summary = "Get full maintenance history for an equipment asset")
  public ResponseEntity<ApiResponse<List<MaintenanceRecordResponse>>> getAssetHistory(
      @PathVariable Long assetId) {
    List<MaintenanceRecordResponse> history =
        maintenanceService.getAssetMaintenanceHistory(assetId);
    return ResponseEntity.ok(ApiResponse.buildSuccess(history));
  }

  @GetMapping("/damage-components")
  @Operation(
      summary = "List machine damage components",
      description =
          "Fetches active damage components, optionally filtered by equipmentTypeId or typeCode. Universal components are always included.")
  public ResponseEntity<ApiResponse<List<MaintenanceDamageComponent>>> listDamageComponents(
      @RequestParam(required = false) Long equipmentTypeId,
      @RequestParam(required = false) String typeCode) {
    List<MaintenanceDamageComponent> components =
        maintenanceService.getActiveDamageComponents(equipmentTypeId, typeCode);
    return ResponseEntity.ok(ApiResponse.buildSuccess(components));
  }

  @PostMapping("/damage-components")
  @Operation(
      summary = "Register a new damage component",
      description =
          "Adds a new component to the database linked to a specific equipment type or marked as universal.")
  public ResponseEntity<ApiResponse<MaintenanceDamageComponent>> createDamageComponent(
      @Valid @RequestBody com.equipgrid.maintenance.dto.CreateDamageComponentRequest request,
      @AuthenticationPrincipal User currentUser) {
    Long userId = currentUser != null ? currentUser.getId() : null;
    MaintenanceDamageComponent component =
        maintenanceService.createDamageComponent(request, userId);
    return ResponseEntity.ok(
        ApiResponse.buildSuccess("Damage component registered successfully", component));
  }

  @PostMapping(value = "/damage-photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @RateLimited(limit = 30, name = "maintenance_damage_photo_upload")
  @Operation(
      summary = "Upload external damaged part photo",
      description =
          "Uploads a photo of external damaged part to S3 permanent maintenance storage and returns URL.")
  public ResponseEntity<ApiResponse<String>> uploadDamagePhoto(
      @RequestPart("file") MultipartFile file, @AuthenticationPrincipal User currentUser) {
    Long userId = currentUser != null ? currentUser.getId() : null;
    String photoUrl = maintenanceService.uploadDamagePhoto(file, userId);
    return ResponseEntity.ok(
        ApiResponse.buildSuccess("Damage photo uploaded successfully", photoUrl));
  }
}
