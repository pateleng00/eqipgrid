package com.equipgrid.recommendation.dto.response;

import java.math.BigDecimal;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class EquipmentRecommendationResponse {
  Long assetId;
  String assetName;
  String assetTag;
  String reason;
  BigDecimal dailyRate;
  BigDecimal depositAmount;
}
