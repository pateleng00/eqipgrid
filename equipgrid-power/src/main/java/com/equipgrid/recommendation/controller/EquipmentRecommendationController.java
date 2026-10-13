package com.equipgrid.recommendation.controller;
import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.asset.enums.AssetStatus;
import com.equipgrid.asset.repository.AssetQueryRepository;
import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.core.ratelimiter.RateLimited;
import com.equipgrid.recommendation.dto.request.EquipmentRecommendationRequest;
import com.equipgrid.recommendation.dto.response.EquipmentRecommendationResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Comparator;
import java.util.List;

@RestController @RequiredArgsConstructor @RequestMapping("/recommendations")
public class EquipmentRecommendationController {
 private final AssetQueryRepository assets;
 @PostMapping("/equipment")
 @RateLimited(name = "recommend_equipment")
 public ResponseEntity<ApiResponse<List<EquipmentRecommendationResponse>>> recommend(@Valid @RequestBody EquipmentRecommendationRequest request) {
  String task=request.getTask().toLowerCase(); AssetCategory category=(task.contains("juta")||task.contains("till")||task.contains("weed")||task.contains("nirai")||task.contains("harvest")||task.contains("kata")||task.contains("spray")||task.contains("chhid")||task.contains("farm")||task.contains("khet"))?AssetCategory.AGRICULTURE:AssetCategory.CONSTRUCTION;
  List<EquipmentRecommendationResponse> result=assets.fetchAssets(category, AssetStatus.AVAILABLE).stream().filter(a->request.getHubId()==null||(a.getHub()!=null&&request.getHubId().equals(a.getHub().getId()))).sorted(Comparator.comparing(a->score(a,task))).limit(2).map(a->EquipmentRecommendationResponse.builder().assetId(a.getId()).assetName(a.getName()).assetTag(a.getAssetTag()).dailyRate(a.getDailyRate()).depositAmount(a.getDepositAmount()).reason(reason(task,a)).build()).toList();
  return ResponseEntity.ok(ApiResponse.buildSuccess(result));
 }
 private int score(Asset a,String task){String n=(a.getName()+" "+a.getAssetTag()).toLowerCase(); if((task.contains("weed")||task.contains("nirai"))&&n.contains("weed"))return 0;if((task.contains("harvest")||task.contains("kata"))&&(n.contains("reaper")||n.contains("harvest")))return 0;if((task.contains("spray")||task.contains("chhid"))&&n.contains("spray"))return 0;if((task.contains("juta")||task.contains("till"))&&(n.contains("tractor")||n.contains("rotavator")))return 0;if((task.contains("water")||task.contains("pump"))&&n.contains("pump"))return 0;return 1;}
 private String reason(String task,Asset a){return "Recommended for " + task + ": " + a.getName();}
}
