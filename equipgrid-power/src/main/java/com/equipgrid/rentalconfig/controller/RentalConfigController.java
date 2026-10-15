package com.equipgrid.rentalconfig.controller;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.rentalconfig.dto.request.CreateRentalConfigRequest;
import com.equipgrid.rentalconfig.dto.request.UpdateRentalConfigRequest;
import com.equipgrid.rentalconfig.entity.RentalConfiguration;
import com.equipgrid.rentalconfig.service.IRentalConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/rental-configs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(
    name = "Rental Configuration",
    description =
        "Base daily rates, security deposits, operator and delivery pricing per hub/asset")
public class RentalConfigController {

  private final IRentalConfigService rentalConfigService;

  @GetMapping
  @Operation(summary = "Get rental configurations filtered by hub or asset")
  public ResponseEntity<ApiResponse<List<RentalConfiguration>>> getRentalConfigs(
      @RequestParam(required = false) Long hubId, @RequestParam(required = false) Long assetId) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            "Rental configurations fetched", rentalConfigService.getRentalConfigs(hubId, assetId)));
  }

  @PostMapping
  @Operation(summary = "Create rental configuration")
  public ResponseEntity<ApiResponse<RentalConfiguration>> createRentalConfig(
      @Valid @RequestBody CreateRentalConfigRequest request) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            "Rental configuration created", rentalConfigService.createRentalConfig(request)));
  }

  @PutMapping("/{id}")
  @Operation(summary = "Update rental configuration")
  public ResponseEntity<ApiResponse<RentalConfiguration>> updateRentalConfig(
      @PathVariable Long id, @Valid @RequestBody UpdateRentalConfigRequest request) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            "Rental configuration updated", rentalConfigService.updateRentalConfig(id, request)));
  }

  @DeleteMapping("/{id}")
  @Operation(summary = "Deactivate rental configuration")
  public ResponseEntity<ApiResponse<Void>> deleteRentalConfig(@PathVariable Long id) {
    rentalConfigService.deleteRentalConfig(id);
    return ResponseEntity.ok(
        ApiResponse.buildSuccess("SG-200", "Rental configuration removed", null));
  }
}
