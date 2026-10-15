package com.equipgrid.intelligence.dto.model;

import java.math.BigDecimal;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EquipmentCardDto {
  private Long id;
  private String assetTag;
  private String name;
  private String hindiName;
  private String category;
  private BigDecimal dailyRate;
  private BigDecimal depositAmount;
  private String status;
  private String hubName;
  private String cityName;
  private String imageUrl;
  private String bookingUrl;
  private List<String> keyFeatures;
}
