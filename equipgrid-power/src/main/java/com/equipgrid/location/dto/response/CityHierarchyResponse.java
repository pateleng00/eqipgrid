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
public class CityHierarchyResponse {
  private Long cityId;
  private String cityName;
  private String pinCode;
  private List<HubHierarchyResponse> hubs;
}
