package com.equipgrid.maintenance.service;

import com.equipgrid.maintenance.dto.CompleteMaintenanceRequest;
import com.equipgrid.maintenance.dto.CreateMaintenanceRequest;
import com.equipgrid.maintenance.dto.MaintenanceRecordResponse;
import com.equipgrid.maintenance.dto.UpdateMaintenanceProgressRequest;
import com.equipgrid.maintenance.enums.MaintenanceStatus;
import java.util.List;
import org.springframework.web.multipart.MultipartFile;

public interface IMaintenanceService {

  MaintenanceRecordResponse createMaintenanceRecord(CreateMaintenanceRequest request, Long userId);

  MaintenanceRecordResponse updateMaintenanceProgress(
      Long ticketId, UpdateMaintenanceProgressRequest request, Long userId);

  MaintenanceRecordResponse completeMaintenanceRecord(
      Long ticketId, CompleteMaintenanceRequest request, Long userId);

  MaintenanceRecordResponse uploadMaintenanceInvoice(
      Long ticketId, MultipartFile file, Long userId);

  List<MaintenanceRecordResponse> getMaintenanceRecords(
      Long hubId, MaintenanceStatus status, Boolean activeOnly);

  MaintenanceRecordResponse getMaintenanceRecordById(Long ticketId);

  List<MaintenanceRecordResponse> getAssetMaintenanceHistory(Long assetId);

  List<com.equipgrid.maintenance.entity.MaintenanceDamageComponent> getActiveDamageComponents();

  String uploadDamagePhoto(MultipartFile file, Long userId);
}
