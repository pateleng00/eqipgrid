package com.equipgrid.whatsapp.service;

import com.equipgrid.whatsapp.dto.model.UpiPaymentDetails;

import java.math.BigDecimal;

public interface IUpiQrGeneratorService {

    /**
     * Constructs the standard NPCI UPI deep link URL.
     */
    String generateUpiPaymentUri(String vpa, String payeeName, BigDecimal amount, String transactionNote, String referenceId);

    /**
     * Generates a raw PNG byte array of the UPI QR code for scanning.
     */
    byte[] generateQrCodeBytes(String content, int width, int height);

    /**
     * Generates a Base64 encoded data URI (data:image/png;base64,...) for direct display or messaging.
     */
    String generateQrCodeBase64(String content, int width, int height);

    /**
     * Generates full payment details model with embedded QR code.
     */
    UpiPaymentDetails buildUpiPaymentDetails(String bookingNumber, BigDecimal amount, String transactionNote);
}
