package com.equipgrid.whatsapp.security;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;

class MetaSignatureValidatorTest {

  @Test
  void verifiesValidHmacSha256Signature() throws Exception {
    String appSecret = "test_meta_app_secret_12345";
    MetaSignatureValidator validator = new MetaSignatureValidator(appSecret, true);

    String payload = "{\"object\":\"whatsapp_business_account\",\"entry\":[]}";

    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(appSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    String hmacHex =
        HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
    String signatureHeader = "sha256=" + hmacHex;

    assertTrue(
        validator.isValidSignature(payload, signatureHeader),
        "Valid HMAC should pass verification");
  }

  @Test
  void rejectsTamperedPayload() throws Exception {
    String appSecret = "test_meta_app_secret_12345";
    MetaSignatureValidator validator = new MetaSignatureValidator(appSecret, true);

    String payload = "{\"object\":\"whatsapp_business_account\",\"entry\":[]}";
    String tamperedPayload =
        "{\"object\":\"whatsapp_business_account\",\"entry\":[{\"fake\":true}]}";

    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(appSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    String hmacHex =
        HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
    String signatureHeader = "sha256=" + hmacHex;

    assertFalse(
        validator.isValidSignature(tamperedPayload, signatureHeader),
        "Tampered payload must be rejected");
  }

  @Test
  void rejectsMissingOrMalformedHeader() {
    String appSecret = "test_meta_app_secret_12345";
    MetaSignatureValidator validator = new MetaSignatureValidator(appSecret, true);
    String payload = "{\"test\":true}";

    assertFalse(validator.isValidSignature(payload, null), "Null header must be rejected");
    assertFalse(validator.isValidSignature(payload, ""), "Empty header must be rejected");
    assertFalse(
        validator.isValidSignature(payload, "invalid_header_format"),
        "Non sha256= header must be rejected");
  }
}
