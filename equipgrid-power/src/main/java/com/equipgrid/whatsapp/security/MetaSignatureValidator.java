package com.equipgrid.whatsapp.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Validates Meta WhatsApp Cloud API HMAC-SHA256 signatures (X-Hub-Signature-256 header) to ensure
 * that incoming webhook payloads originate strictly from Meta servers.
 */
@Slf4j
@Component
public class MetaSignatureValidator {

  private final String appSecret;
  private final boolean verificationEnabled;

  public MetaSignatureValidator(
      @Value("${equipgrid.whatsapp.meta.app-secret}") String appSecret,
      @Value("${equipgrid.whatsapp.meta.verify-signature}") boolean verificationEnabled) {
    this.appSecret = appSecret != null ? appSecret.trim() : "";
    this.verificationEnabled = verificationEnabled;
  }

  /**
   * Verifies that the raw webhook payload matches the signature in X-Hub-Signature-256.
   *
   * @param payload Raw request body string
   * @param signatureHeader Header in format "sha256=<hex_hmac>"
   * @return true if authentic; false if forged, missing, or mismatched
   */
  public boolean isValidSignature(String payload, String signatureHeader) {
    // If verification is explicitly turned off (local dev/test)
    if (!verificationEnabled) {
      return true;
    }

    if (signatureHeader == null
        || signatureHeader.isBlank()
        || !signatureHeader.startsWith("sha256=")) {
      log.warn("[Meta Signature] Missing or malformed X-Hub-Signature-256 header");
      return false;
    }

    if (appSecret.isBlank()) {
      log.warn(
          "[Meta Signature] Verification enabled but equipgrid.whatsapp.meta.app-secret is empty");
      return false;
    }

    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      SecretKeySpec secretKey =
          new SecretKeySpec(appSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
      mac.init(secretKey);

      byte[] hmacBytes =
          mac.doFinal((payload != null ? payload : "").getBytes(StandardCharsets.UTF_8));
      String expectedSignature = "sha256=" + HexFormat.of().formatHex(hmacBytes);

      boolean match =
          MessageDigest.isEqual(
              expectedSignature.getBytes(StandardCharsets.UTF_8),
              signatureHeader.trim().getBytes(StandardCharsets.UTF_8));

      if (!match) {
        log.warn(
            "[Meta Signature] HMAC mismatch! Received: {}, Expected: {}",
            signatureHeader,
            expectedSignature);
      }
      return match;
    } catch (Exception e) {
      log.error("[Meta Signature] Cryptographic error validating HMAC-SHA256: {}", e.getMessage());
      return false;
    }
  }
}
