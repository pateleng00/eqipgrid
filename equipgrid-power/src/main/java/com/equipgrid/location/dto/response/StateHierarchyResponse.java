package com.equipgrid.location.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StateHierarchyResponse {
    private Long stateId;
    private String stateName;
    private String stateCode;
    private List<CityHierarchyResponse> cities;
}
