package com.equipgrid.asset.dto.response;

import com.equipgrid.asset.entity.AssetMedia;
import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.asset.enums.BillingUnit;
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
    private String localLanguageName;
    private String description;
    private String hindiDescription;
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
    private String manufacturerName;
    private String modelNumber;
    private String typeName;
    private String typeCode;
    private String accessoriesIncluded;
    private String conditionNotes;
    private BigDecimal engineHours;
    private String specs;
    private String serialNumber;
    private BillingUnit billingUnit;
    private BigDecimal workingHoursLimit;
    private String shiftTerms;
    private Long billingUnitId;
    private String unitLabel;
    private String hindiUnitLabel;
    private String unitLabelLong;
    private String billingUnitCode;
    private String billingUnitName;
    private String billingUnitHindiName;
}
