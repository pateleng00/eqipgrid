package com.equipgrid.farmlocation.controller;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.core.ratelimiter.RateLimited;
import com.equipgrid.farmlocation.dto.request.UpsertFarmLocationRequest;
import com.equipgrid.farmlocation.entity.FarmLocation;
import com.equipgrid.farmlocation.service.IFarmLocationService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/customers/{customerId}/farm-locations")
@Tag(
    name = "Farmer locations",
    description = "Locally named farms and delivery places for a customer")
public class FarmLocationController {
  private final IFarmLocationService farmLocationService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<FarmLocation>>> list(@PathVariable Long customerId) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(farmLocationService.getCustomerLocations(customerId)));
  }

  @PostMapping
  @RateLimited(limit = 10, name = "farmlocation_create")
  public ResponseEntity<ApiResponse<FarmLocation>> create(
      @PathVariable Long customerId, @Valid @RequestBody UpsertFarmLocationRequest request) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            "Farm location saved", farmLocationService.create(customerId, request)));
  }

  @PatchMapping("/{locationId}")
  @RateLimited(limit = 10, name = "farmlocation_update")
  public ResponseEntity<ApiResponse<FarmLocation>> update(
      @PathVariable Long customerId,
      @PathVariable Long locationId,
      @Valid @RequestBody UpsertFarmLocationRequest request) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            "Farm location updated", farmLocationService.update(customerId, locationId, request)));
  }
}
