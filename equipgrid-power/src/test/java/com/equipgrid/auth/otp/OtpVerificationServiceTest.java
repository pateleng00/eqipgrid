package com.equipgrid.auth.otp;

import com.equipgrid.whatsapp.service.MetaWhatsAppClientService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;

class OtpVerificationServiceTest {

    private OtpProperties properties;
    private MetaWhatsAppClientService metaWhatsAppClient;
    private OtpVerificationService otpService;

    @BeforeEach
    void setUp() {
        properties = new OtpProperties();
        properties.setEnabled(true);
        properties.setExpiryMinutes(5);
        properties.setProofTokenExpiryMinutes(15);
        properties.setMaxAttempts(3);
        properties.setDevBypassCode("123456");

        metaWhatsAppClient = Mockito.mock(MetaWhatsAppClientService.class);
        otpService = new OtpVerificationService(properties, metaWhatsAppClient);
    }

    @Test
    void sendsOtpSuccessfully() {
        String phone = "9876543210";
        String result = otpService.sendOtp(phone);
        assertNotNull(result);
        assertTrue(result.contains("OTP sent successfully"));
        Mockito.verify(metaWhatsAppClient).sendTextMessage(Mockito.eq("9876543210"), anyString());
    }

    @Test
    void verifiesWithDevBypassCode() {
        String phone = "9876543210";
        OtpVerificationResponse response = otpService.verifyOtp(phone, "123456");
        assertTrue(response.isVerified());
        assertNotNull(response.getOtpProofToken());
        assertTrue(otpService.isPhoneVerified(phone, response.getOtpProofToken()));
    }

    @Test
    void rejectsInvalidProofToken() {
        String phone = "9876543210";
        assertFalse(otpService.isPhoneVerified(phone, "fake-invalid-token"));
        assertFalse(otpService.isPhoneVerified(phone, null));
    }

    @Test
    void normalizesIndianPhoneNumbers() {
        assertEquals("9876543210", OtpVerificationService.normalizePhone("+919876543210"));
        assertEquals("9876543210", OtpVerificationService.normalizePhone("919876543210"));
        assertEquals("9876543210", OtpVerificationService.normalizePhone("9876543210"));
        assertEquals("9876543210", OtpVerificationService.normalizePhone("+91 98765 43210"));
    }
}
