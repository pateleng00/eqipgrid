package com.equipgrid.location.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HubHierarchyResponse {
    private Long hubId;
    private String hubName;
    private String hubCode;
    private String address;
    private String contactPhone;
    private BigDecimal operatingRadiusKm;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private int totalMachineCount;
    private Map<String, Integer> categoryCounts;
    private List<HubMachineResponse> machines;
}
