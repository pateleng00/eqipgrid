package com.equipgrid.master.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FuzzyCheckResponse {

  private boolean duplicate;

  private String matchedName;

  private double similarityPercentage;

  private String message;
}
