package com.equipgrid.whatsapp.dto.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class WhatsAppConversationContext {
    private String selectedCategory;
    private Long selectedHubId;
    private String selectedHubName;
    private String selectedCityName;
    private Long selectedAssetId;
    private String selectedAssetName;
    private String selectedAssetTag;
    private String assetCategory; // "AGRICULTURE" | "CONSTRUCTION"
    private String deliveryDestinationType; // "HOME" | "FARM" | "SITE"
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer rentalDays;
    private String deliveryAddress;
    private Double latitude;
    private Double longitude;
    private String googleMapsUrl;
    private Boolean isGeoLocation;
    private BigDecimal dailyRate;
    private BigDecimal securityDeposit;
    private BigDecimal calculatedRentalAmount;
    private BigDecimal calculatedDepositAmount;
    private BigDecimal calculatedTotal;
    private Long activeBookingId;
    private String activeBookingNumber;
    private String customerName;
    private String previewImageUrl;
    private String demoVideoUrl;
    private List<String> mediaUrls;

    // ─── Voice Note Processing ──────────────────────────────────────────
    /** Raw transcribed text from Gemini / upstream STT for the latest voice note */
    private String lastVoiceTranscript;
    /** Detected language from voice ("hi" = Hindi, "en" = English, etc.) */
    private String detectedLanguage;
    /** True if the user's last message was a voice note */
    private Boolean voiceNoteReceived;
    /** Number of consecutive voice note processing retries */
    private Integer voiceRetryCount;

    // ─── Damage Checklist (Return Inspection) ───────────────────────────
    /** Current checklist item index being evaluated (0-based) */
    private Integer checklistCurrentItemIndex;
    /** Map of checklist item key -> customer photo URL (S3 key or media URL) */
    private Map<String, String> checklistItemPhotos;
    /** Map of checklist item key -> customer-confirmed status ("OK" | "DAMAGED" | "MISSING") */
    private Map<String, String> checklistItemStatuses;
    /** True if the damage checklist flow is fully completed */
    private Boolean checklistCompleted;
    /** Customer-supplied textual damage description */
    private String customerDamageDescription;
}
