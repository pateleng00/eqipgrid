package com.equipgrid.location.controller;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.location.dto.request.CityRequest;
import com.equipgrid.location.dto.request.HubRequest;
import com.equipgrid.location.dto.response.StateHierarchyResponse;
import com.equipgrid.location.entity.City;
import com.equipgrid.location.entity.Hub;
import com.equipgrid.location.entity.State;
import com.equipgrid.location.service.ILocationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/locations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(
    name = "Location & Hub Management",
    description = "States, Cities, Station Hubs and Geographic Hierarchy APIs")
public class LocationController {

  private final ILocationService locationService;

  @GetMapping("/states")
  @Operation(summary = "Get states (optionally include inactive)")
  public ResponseEntity<ApiResponse<List<State>>> getStates(
      @RequestParam(required = false, defaultValue = "false") boolean includeInactive) {
    return ResponseEntity.ok(ApiResponse.buildSuccess(locationService.getStates(includeInactive)));
  }

  @PostMapping("/states")
  @Operation(summary = "Create state")
  public ResponseEntity<ApiResponse<State>> createState(@Valid @RequestBody State state) {
    State saved = locationService.createState(state);
    return ResponseEntity.ok(ApiResponse.buildSuccess("SG-200", "State created", saved));
  }

  @GetMapping("/states/{stateId}/cities")
  @Operation(summary = "Get active cities by state ID")
  public ResponseEntity<ApiResponse<List<City>>> getCitiesByState(@PathVariable Long stateId) {
    return ResponseEntity.ok(ApiResponse.buildSuccess(locationService.getCitiesByState(stateId)));
  }

  @GetMapping("/cities")
  @Operation(summary = "Get all cities (optionally include inactive)")
  public ResponseEntity<ApiResponse<List<City>>> getAllCities(
      @RequestParam(required = false, defaultValue = "false") boolean includeInactive) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(locationService.getAllCities(includeInactive)));
  }

  @PostMapping("/cities")
  @Operation(summary = "Create city under a state")
  public ResponseEntity<ApiResponse<City>> createCity(@Valid @RequestBody CityRequest request) {
    City saved = locationService.createCity(request);
    return ResponseEntity.ok(
        ApiResponse.buildSuccess("SG-200", "City created successfully", saved));
  }

  @GetMapping("/cities/{cityId}/hubs")
  @Operation(summary = "Get active hubs in a city")
  public ResponseEntity<ApiResponse<List<Hub>>> getHubsByCity(@PathVariable Long cityId) {
    return ResponseEntity.ok(ApiResponse.buildSuccess(locationService.getHubsByCity(cityId)));
  }

  @GetMapping("/hubs")
  @Operation(summary = "Get all hubs (optionally include inactive)")
  public ResponseEntity<ApiResponse<List<Hub>>> getAllHubs(
      @RequestParam(required = false, defaultValue = "false") boolean includeInactive) {
    return ResponseEntity.ok(ApiResponse.buildSuccess(locationService.getAllHubs(includeInactive)));
  }

  @PostMapping("/hubs")
  @Operation(summary = "Create hub yard in a city")
  public ResponseEntity<ApiResponse<Hub>> createHub(@Valid @RequestBody HubRequest request) {
    Hub saved = locationService.createHub(request);
    return ResponseEntity.ok(
        ApiResponse.buildSuccess("SG-200", "Hub yard created successfully", saved));
  }

  @GetMapping("/hierarchy")
  @Operation(summary = "Fetch active geographic hierarchy with mapped machines per hub")
  public ResponseEntity<ApiResponse<List<StateHierarchyResponse>>> getLocationHierarchy() {
    List<StateHierarchyResponse> hierarchy = locationService.getLocationHierarchy();
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            "SG-200", "Location hierarchy with active machinery fetched successfully", hierarchy));
  }

  // ─── Status Toggle & Management Endpoints ─────────────────────────────────

  @PatchMapping("/hubs/{hubId}/status")
  @Operation(summary = "Update hub active status (barred if active machines exist in hub)")
  public ResponseEntity<ApiResponse<Hub>> updateHubStatus(
      @PathVariable Long hubId, @RequestParam boolean active) {
    Hub updated = locationService.updateHubStatus(hubId, active);
    return ResponseEntity.ok(
        ApiResponse.buildSuccess("SG-200", "Hub status updated successfully", updated));
  }

  @PutMapping("/hubs/{hubId}")
  @Operation(summary = "Update hub details")
  public ResponseEntity<ApiResponse<Hub>> updateHub(
      @PathVariable Long hubId, @Valid @RequestBody HubRequest request) {
    Hub updated = locationService.updateHub(hubId, request);
    return ResponseEntity.ok(
        ApiResponse.buildSuccess("SG-200", "Hub updated successfully", updated));
  }

  @DeleteMapping("/hubs/{hubId}")
  @Operation(summary = "Delete hub (barred if active machines exist in hub)")
  public ResponseEntity<ApiResponse<Void>> deleteHub(@PathVariable Long hubId) {
    locationService.deleteHub(hubId);
    return ResponseEntity.ok(ApiResponse.buildSuccess("SG-200", "Hub deleted successfully", null));
  }

  @PatchMapping("/cities/{cityId}/status")
  @Operation(summary = "Update city active status (barred if active machines exist in city hubs)")
  public ResponseEntity<ApiResponse<City>> updateCityStatus(
      @PathVariable Long cityId, @RequestParam boolean active) {
    City updated = locationService.updateCityStatus(cityId, active);
    return ResponseEntity.ok(
        ApiResponse.buildSuccess("SG-200", "City status updated successfully", updated));
  }

  @PutMapping("/cities/{cityId}")
  @Operation(summary = "Update city details")
  public ResponseEntity<ApiResponse<City>> updateCity(
      @PathVariable Long cityId, @Valid @RequestBody CityRequest request) {
    City updated = locationService.updateCity(cityId, request);
    return ResponseEntity.ok(
        ApiResponse.buildSuccess("SG-200", "City updated successfully", updated));
  }

  @DeleteMapping("/cities/{cityId}")
  @Operation(summary = "Delete city (barred if active machines exist in city hubs)")
  public ResponseEntity<ApiResponse<Void>> deleteCity(@PathVariable Long cityId) {
    locationService.deleteCity(cityId);
    return ResponseEntity.ok(ApiResponse.buildSuccess("SG-200", "City deleted successfully", null));
  }

  @PatchMapping("/states/{stateId}/status")
  @Operation(summary = "Update state active status (barred if active machines exist in state hubs)")
  public ResponseEntity<ApiResponse<State>> updateStateStatus(
      @PathVariable Long stateId, @RequestParam boolean active) {
    State updated = locationService.updateStateStatus(stateId, active);
    return ResponseEntity.ok(
        ApiResponse.buildSuccess("SG-200", "State status updated successfully", updated));
  }

  @PutMapping("/states/{stateId}")
  @Operation(summary = "Update state details")
  public ResponseEntity<ApiResponse<State>> updateState(
      @PathVariable Long stateId, @Valid @RequestBody State request) {
    State updated = locationService.updateState(stateId, request);
    return ResponseEntity.ok(
        ApiResponse.buildSuccess("SG-200", "State updated successfully", updated));
  }

  @DeleteMapping("/states/{stateId}")
  @Operation(summary = "Delete state (barred if active machines exist in state hubs)")
  public ResponseEntity<ApiResponse<Void>> deleteState(@PathVariable Long stateId) {
    locationService.deleteState(stateId);
    return ResponseEntity.ok(
        ApiResponse.buildSuccess("SG-200", "State deleted successfully", null));
  }
}
