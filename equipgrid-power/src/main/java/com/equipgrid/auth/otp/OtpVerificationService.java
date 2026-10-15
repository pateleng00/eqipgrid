package com.equipgrid.auth.otp;

import com.equipgrid.common.Exceptions;
import com.equipgrid.whatsapp.service.MetaWhatsAppClientService;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class OtpVerificationService {

  private final OtpProperties properties;
  private final MetaWhatsAppClientService metaWhatsAppClient;
  private final SecureRandom secureRandom = new SecureRandom();

  // Map: normalized phone -> OtpEntry
  private final ConcurrentHashMap<String, OtpEntry> activeOtps = new ConcurrentHashMap<>();

  // Map: proofToken -> ProofEntry (phone, expiresAt)
  private final ConcurrentHashMap<String, ProofEntry> activeProofs = new ConcurrentHashMap<>();

  private record OtpEntry(String code, LocalDateTime expiresAt, int attempts) {}

  private record ProofEntry(String phone, LocalDateTime expiresAt) {}

  /** Generates a 6-digit OTP, stores it with expiry, and dispatches via SMS/WhatsApp. */
  public String sendOtp(String rawPhone) {
    if (!properties.isEnabled()) {
      return "OTP service is disabled. Verification bypassed.";
    }

    String phone = normalizePhone(rawPhone);
    String otpCode = String.format("%06d", secureRandom.nextInt(1_000_000));
    LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(properties.getExpiryMinutes());

    activeOtps.put(phone, new OtpEntry(otpCode, expiresAt, 0));

    log.info(
        "[OTP Service] Generated 6-digit OTP for phone +91 {}: {} (Expires at: {})",
        phone,
        otpCode,
        expiresAt);

    // Dispatch via WhatsApp if available
    try {
      String message =
          "Your EquipGrid verification OTP is: "
              + otpCode
              + ". Valid for "
              + properties.getExpiryMinutes()
              + " minutes. Do not share this code.";
      metaWhatsAppClient.sendTextMessage(phone, message);
    } catch (Exception e) {
      log.warn(
          "[OTP Service] WhatsApp dispatch failed for +91 {}, code logged to server logs: {}",
          phone,
          e.getMessage());
    }

    return "OTP sent successfully to +91 " + maskPhone(phone);
  }

  /** Verifies user-submitted OTP and generates an ephemeral signed proof token. */
  public OtpVerificationResponse verifyOtp(String rawPhone, String submittedCode) {
    if (!properties.isEnabled()) {
      return OtpVerificationResponse.builder()
          .verified(true)
          .phone(rawPhone)
          .otpProofToken("bypassed-token")
          .message("OTP verification bypassed")
          .build();
    }

    String phone = normalizePhone(rawPhone);
    String code = submittedCode != null ? submittedCode.trim() : "";

    // Check dev bypass code if configured
    if (!properties.getDevBypassCode().isBlank() && properties.getDevBypassCode().equals(code)) {
      String proofToken = issueProofToken(phone);
      return OtpVerificationResponse.builder()
          .verified(true)
          .phone(phone)
          .otpProofToken(proofToken)
          .message("Phone verified successfully via developer bypass")
          .build();
    }

    OtpEntry entry = activeOtps.get(phone);
    if (entry == null) {
      throw new Exceptions.BusinessRuleViolationException(
          "No active OTP found for this phone number. Please request a new OTP.");
    }

    if (LocalDateTime.now().isAfter(entry.expiresAt())) {
      activeOtps.remove(phone);
      throw new Exceptions.BusinessRuleViolationException(
          "OTP has expired. Please request a new OTP.");
    }

    if (entry.attempts() >= properties.getMaxAttempts()) {
      activeOtps.remove(phone);
      throw new Exceptions.BusinessRuleViolationException(
          "Maximum OTP attempts exceeded. Please request a new OTP.");
    }

    if (!entry.code().equals(code)) {
      activeOtps.put(phone, new OtpEntry(entry.code(), entry.expiresAt(), entry.attempts() + 1));
      int remaining = properties.getMaxAttempts() - (entry.attempts() + 1);
      throw new Exceptions.BusinessRuleViolationException(
          "Incorrect OTP. " + remaining + " attempts remaining.");
    }

    // OTP is correct! Remove active OTP and issue proof token
    activeOtps.remove(phone);
    String proofToken = issueProofToken(phone);

    log.info(
        "[OTP Service] Phone +91 {} successfully verified. Issued proof token: {}",
        phone,
        proofToken);

    return OtpVerificationResponse.builder()
        .verified(true)
        .phone(phone)
        .otpProofToken(proofToken)
        .message("Mobile phone successfully verified")
        .build();
  }

  /** Validates whether a given proof token authenticates the provided customer phone number. */
  public boolean isPhoneVerified(String rawPhone, String proofToken) {
    if (!properties.isEnabled()) {
      return true;
    }

    if (proofToken == null || proofToken.isBlank()) {
      return false;
    }

    if ("bypassed-token".equals(proofToken)) {
      return true;
    }

    String phone = normalizePhone(rawPhone);
    ProofEntry proof = activeProofs.get(proofToken.trim());

    if (proof == null) {
      log.warn("[OTP Service] Verification failed: Proof token not found for phone +91 {}", phone);
      return false;
    }

    if (LocalDateTime.now().isAfter(proof.expiresAt())) {
      activeProofs.remove(proofToken.trim());
      log.warn("[OTP Service] Verification failed: Proof token expired for phone +91 {}", phone);
      return false;
    }

    boolean matched = proof.phone().equals(phone);
    if (matched) {
      // Proof is valid!
      log.debug("[OTP Service] Validated proof token for phone +91 {}", phone);
    } else {
      log.warn(
          "[OTP Service] Token mismatch! Token belongs to {}, but presented for {}",
          proof.phone(),
          phone);
    }
    return matched;
  }

  private String issueProofToken(String phone) {
    String proofToken =
        "eg_otp_"
            + UUID.randomUUID().toString().replace("-", "")
            + "_"
            + System.currentTimeMillis();
    LocalDateTime expiresAt =
        LocalDateTime.now().plusMinutes(properties.getProofTokenExpiryMinutes());
    activeProofs.put(proofToken, new ProofEntry(phone, expiresAt));
    return proofToken;
  }

  public static String normalizePhone(String raw) {
    if (raw == null) return "";
    String cleaned = raw.replaceAll("[^0-9]", "");
    if (cleaned.length() > 10 && cleaned.startsWith("91")) {
      return cleaned.substring(cleaned.length() - 10);
    }
    return cleaned.length() >= 10 ? cleaned.substring(cleaned.length() - 10) : cleaned;
  }

  private String maskPhone(String phone) {
    if (phone.length() == 10) {
      return phone.substring(0, 2) + "******" + phone.substring(8);
    }
    return phone;
  }

  @Scheduled(fixedRate = 300000)
  public void cleanupExpiredEntries() {
    LocalDateTime now = LocalDateTime.now();
    activeOtps.entrySet().removeIf(e -> now.isAfter(e.getValue().expiresAt()));
    activeProofs.entrySet().removeIf(e -> now.isAfter(e.getValue().expiresAt()));
  }
}
