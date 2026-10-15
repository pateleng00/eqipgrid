package com.equipgrid.core.ratelimiter;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "equipgrid.ratelimiter")
public class RateLimiterProperties {
  private boolean enabled = true;
  private int defaultLimit = 5;
  private long defaultDurationSeconds = 60;
}
