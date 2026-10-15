package com.equipgrid.core.botshield;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** Configuration properties for Cloudflare Turnstile Invisible Bot Shield. */
@Data
@Component
@ConfigurationProperties(prefix = "equipgrid.botshield.turnstile")
public class TurnstileProperties {

  /** Whether Cloudflare Turnstile verification is globally enforced. */
  private boolean enabled = true;

  /**
   * Cloudflare Turnstile Secret Key. Default uses Cloudflare's official always-pass test key
   * (1x0000000000000000000000000000000AA).
   */
  private String secretKey = "1x0000000000000000000000000000000AA";

  /** Cloudflare verification endpoint. */
  private String verifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
}
