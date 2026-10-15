package com.equipgrid.recommendation.controller;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.core.ratelimiter.RateLimited;
import com.equipgrid.recommendation.dto.request.EquipmentRecommendationRequest;
import com.equipgrid.recommendation.dto.response.EquipmentRecommendationResponse;
import com.equipgrid.recommendation.service.IEquipmentRecommendationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/recommendations")
@Tag(
    name = "Equipment Recommendations",
    description = "AI and rule-based machinery recommendation engine based on user site tasks")
public class EquipmentRecommendationController {

  private final IEquipmentRecommendationService recommendationService;

  @PostMapping("/equipment")
  @RateLimited(name = "recommend_equipment")
  @Operation(summary = "Recommend machinery based on task description and hub location")
  public ResponseEntity<ApiResponse<List<EquipmentRecommendationResponse>>> recommend(
      @Valid @RequestBody EquipmentRecommendationRequest request) {
    List<EquipmentRecommendationResponse> result =
        recommendationService.recommendEquipment(request);
    return ResponseEntity.ok(ApiResponse.buildSuccess(result));
  }
}
