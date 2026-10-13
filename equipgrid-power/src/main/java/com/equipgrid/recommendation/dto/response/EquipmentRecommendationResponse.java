package com.equipgrid.recommendation.dto.response;
import lombok.Builder;
import lombok.Value;
import java.math.BigDecimal;
@Value @Builder public class EquipmentRecommendationResponse { Long assetId; String assetName; String assetTag; String reason; BigDecimal dailyRate; BigDecimal depositAmount; }
