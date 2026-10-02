package com.equipgrid.whatsapp.service;

import com.equipgrid.whatsapp.dto.model.UpiPaymentDetails;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.EnumMap;
import java.util.Map;

@Slf4j
@Service
public class UpiQrGeneratorServiceImpl implements IUpiQrGeneratorService {

    @Value("${equipgrid.upi.vpa:equipgrid@upi}")
    private String defaultVpa;

    @Value("${equipgrid.upi.payee-name:EquipGrid Agro and Civil Rentals}")
    private String defaultPayeeName;

    @Override
    public String generateUpiPaymentUri(String vpa, String payeeName, BigDecimal amount, String transactionNote, String referenceId) {
        String activeVpa = (vpa != null && !vpa.isBlank()) ? vpa : defaultVpa;
        String activeName = (payeeName != null && !payeeName.isBlank()) ? payeeName : defaultPayeeName;
        BigDecimal formattedAmount = (amount != null) ? amount.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        String encodedName = URLEncoder.encode(activeName, StandardCharsets.UTF_8);
        String encodedNote = URLEncoder.encode(transactionNote != null ? transactionNote : "EquipGrid Rental Payment", StandardCharsets.UTF_8);
        String encodedRef = (referenceId != null) ? URLEncoder.encode(referenceId, StandardCharsets.UTF_8) : "";

        StringBuilder uri = new StringBuilder("upi://pay?");
        uri.append("pa=").append(activeVpa);
        uri.append("&pn=").append(encodedName);
        uri.append("&am=").append(formattedAmount.toPlainString());
        uri.append("&cu=INR");
        uri.append("&tn=").append(encodedNote);
        if (!encodedRef.isBlank()) {
            uri.append("&tr=").append(encodedRef);
        }
        return uri.toString();
    }

    @Override
    public byte[] generateQrCodeBytes(String content, int width, int height) {
        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
            hints.put(EncodeHintType.MARGIN, 1);
            hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);

            BitMatrix bitMatrix = qrCodeWriter.encode(content, BarcodeFormat.QR_CODE, width, height, hints);
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate QR code for content: {}", content, e);
            throw new RuntimeException("Error generating UPI QR code: " + e.getMessage(), e);
        }
    }

    @Override
    public String generateQrCodeBase64(String content, int width, int height) {
        byte[] bytes = generateQrCodeBytes(content, width, height);
        return "data:image/png;base64," + Base64.getEncoder().encodeToString(bytes);
    }

    @Override
    public UpiPaymentDetails buildUpiPaymentDetails(String bookingNumber, BigDecimal amount, String transactionNote) {
        String ref = bookingNumber != null ? bookingNumber : "EQ-" + System.currentTimeMillis();
        String note = (transactionNote != null && !transactionNote.isBlank())
                ? transactionNote
                : "Rent/Deposit for " + ref;
        String upiUri = generateUpiPaymentUri(defaultVpa, defaultPayeeName, amount, note, ref);
        String qrBase64 = generateQrCodeBase64(upiUri, 300, 300);

        return UpiPaymentDetails.builder()
                .payeeVpa(defaultVpa)
                .payeeName(defaultPayeeName)
                .bookingNumber(bookingNumber)
                .amount(amount != null ? amount.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO)
                .transactionNote(note)
                .upiUri(upiUri)
                .qrCodeBase64(qrBase64)
                .qrCodeImageUrl("/api/v1/whatsapp/qr/" + (bookingNumber != null ? bookingNumber : "quick"))
                .build();
    }
}
