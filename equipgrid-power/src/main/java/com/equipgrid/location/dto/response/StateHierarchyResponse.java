package com.equipgrid.location.dto.response;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
