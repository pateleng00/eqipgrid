package com.equipgrid.recommendation.service;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.asset.enums.AssetStatus;
import com.equipgrid.asset.repository.AssetQueryRepository;
import com.equipgrid.recommendation.dto.request.EquipmentRecommendationRequest;
import com.equipgrid.recommendation.dto.response.EquipmentRecommendationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EquipmentRecommendationServiceImpl implements IEquipmentRecommendationService {

    private final AssetQueryRepository assetQueryRepository;

    @Override
    public List<EquipmentRecommendationResponse> recommendEquipment(EquipmentRecommendationRequest request) {
        String task = request.getTask().toLowerCase();

        AssetCategory category;
        if (task.contains("generator") || task.contains("diesel gen") || task.contains("bijli") || task.contains("pump") || task.contains("water") || task.contains("dual") || task.contains("multi")) {
            category = AssetCategory.MULTIPURPOSE_FLEET;
        } else if (task.contains("juta") || task.contains("till") || task.contains("weed") || task.contains("nirai")
                || task.contains("harvest") || task.contains("kata") || task.contains("spray") || task.contains("chhid")
                || task.contains("farm") || task.contains("khet")) {
            category = AssetCategory.AGRICULTURE;
        } else {
            category = AssetCategory.CONSTRUCTION;
        }

        List<Asset> candidates = assetQueryRepository.fetchAssets(category, AssetStatus.AVAILABLE);

        return candidates.stream()
                .filter(a -> request.getHubId() == null || (a.getHub() != null && request.getHubId().equals(a.getHub().getId())))
                .sorted(Comparator.comparing(a -> score(a, task)))
                .limit(2)
                .map(a -> EquipmentRecommendationResponse.builder()
                        .assetId(a.getId())
                        .assetName(a.getName())
                        .assetTag(a.getAssetTag())
                        .dailyRate(a.getDailyRate())
                        .depositAmount(a.getDepositAmount())
                        .reason(generateReason(task, a))
                        .build())
                .toList();
    }

    private int score(Asset a, String task) {
        String n = (a.getName() + " " + a.getAssetTag()).toLowerCase();
        if ((task.contains("weed") || task.contains("nirai")) && n.contains("weed")) return 0;
        if ((task.contains("harvest") || task.contains("kata")) && (n.contains("reaper") || n.contains("harvest"))) return 0;
        if ((task.contains("spray") || task.contains("chhid")) && n.contains("spray")) return 0;
        if ((task.contains("juta") || task.contains("till")) && (n.contains("tractor") || n.contains("rotavator"))) return 0;
        if ((task.contains("water") || task.contains("pump")) && n.contains("pump")) return 0;
        if ((task.contains("concrete") || task.contains("mixer") || task.contains("masala")) && n.contains("mixer")) return 0;
        if ((task.contains("compactor") || task.contains("kutai")) && n.contains("compactor")) return 0;
        return 1;
    }

    private String generateReason(String task, Asset a) {
        return "Recommended for " + task + ": " + a.getName();
    }
}
