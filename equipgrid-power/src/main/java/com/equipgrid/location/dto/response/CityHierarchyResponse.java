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
public class CityHierarchyResponse {
    private Long cityId;
    private String cityName;
    private String pinCode;
    private List<HubHierarchyResponse> hubs;
}
