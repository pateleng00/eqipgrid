package com.equipgrid.recommendation.service;

import com.equipgrid.recommendation.dto.request.EquipmentRecommendationRequest;
import com.equipgrid.recommendation.dto.response.EquipmentRecommendationResponse;

import java.util.List;

public interface IEquipmentRecommendationService {

    List<EquipmentRecommendationResponse> recommendEquipment(EquipmentRecommendationRequest request);
}
