package com.equipgrid.property.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DynamicPropertyResponse {

  private Long id;
  private String key;
  private String value;
  private String url;
  private String rawUrl;

  private String bucket;
  private String objectKey;

  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
