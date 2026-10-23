package com.equipgrid.property.controller;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.property.dto.DynamicPropertyRequest;
import com.equipgrid.property.dto.DynamicPropertyResponse;
import com.equipgrid.property.service.DynamicPropertyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/properties")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(
    name = "Dynamic System Properties",
    description = "Manage dynamic runtime properties, S3 media URLs, and website assets")
public class DynamicPropertyController {

  private final DynamicPropertyService dynamicPropertyService;

  @GetMapping("/{key}")
  @Operation(summary = "Get dynamic property by key with web-ready resolved URL")
  public ResponseEntity<ApiResponse<DynamicPropertyResponse>> getPropertyByKey(
      @PathVariable String key) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            "Property fetched successfully", dynamicPropertyService.getPropertyByKey(key)));
  }

  @GetMapping
  @Operation(summary = "Get all dynamic properties")
  public ResponseEntity<ApiResponse<List<DynamicPropertyResponse>>> getAllProperties() {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            "Properties fetched successfully", dynamicPropertyService.getAllProperties()));
  }

  @GetMapping("/video")
  @Operation(summary = "Get website hero background video configuration")
  public ResponseEntity<ApiResponse<DynamicPropertyResponse>> getWebsiteVideo() {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            "Website video property fetched",
            dynamicPropertyService
                .findPropertyByKey("website_hero_video")
                .or(() -> dynamicPropertyService.findPropertyByKey("hero_background_video"))
                .or(() -> dynamicPropertyService.findPropertyByKey("website_video"))
                .orElseGet(() -> dynamicPropertyService.getPropertyByKey("website_hero_video"))));
  }

  @GetMapping("/video/stream")
  @Operation(summary = "Stream or redirect to website hero background video")
  public ResponseEntity<Void> streamWebsiteVideo() {
    DynamicPropertyResponse prop =
        dynamicPropertyService
            .findPropertyByKey("website_hero_video")
            .or(() -> dynamicPropertyService.findPropertyByKey("hero_background_video"))
            .or(() -> dynamicPropertyService.findPropertyByKey("website_video"))
            .orElseGet(() -> dynamicPropertyService.getPropertyByKey("website_hero_video"));

    String redirectUrl = prop.getUrl();
    if (redirectUrl == null || redirectUrl.isBlank()) {
      return ResponseEntity.notFound().build();
    }

    return ResponseEntity.status(HttpStatus.FOUND)
        .header(HttpHeaders.LOCATION, redirectUrl)
        .build();
  }

  @PostMapping
  @Operation(summary = "Create or update dynamic property")
  public ResponseEntity<ApiResponse<DynamicPropertyResponse>> upsertProperty(
      @Valid @RequestBody DynamicPropertyRequest request) {
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            "Property saved successfully", dynamicPropertyService.upsertProperty(request)));
  }

  @PutMapping("/{key}")
  @Operation(summary = "Update dynamic property by key")
  public ResponseEntity<ApiResponse<DynamicPropertyResponse>> updateProperty(
      @PathVariable String key, @RequestBody DynamicPropertyRequest request) {
    request.setKey(key);
    return ResponseEntity.ok(
        ApiResponse.buildSuccess(
            "Property updated successfully", dynamicPropertyService.upsertProperty(request)));
  }
}
