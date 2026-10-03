package com.equipgrid.asset.dto.response;

import com.equipgrid.asset.entity.AssetMedia;
import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.location.entity.Hub;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Builder
public class WebsiteMachineModelResponse {
    private Long id;
    private String assetTag;
    private String name;
    private String hindiName;
    private AssetCategory category;
    private String modelName;
    private BigDecimal dailyRate;
    private BigDecimal depositAmount;
    private String imageUrl;
    private String demoVideoUrl;
    private List<AssetMedia> mediaItems;
    private int totalUnits;
    private int availableUnits;
    private Hub primaryHub;
    private List<String> availableHubNames;
    private List<Long> availableHubIds;
}
