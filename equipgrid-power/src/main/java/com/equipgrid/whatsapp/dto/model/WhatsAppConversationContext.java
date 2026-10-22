package com.equipgrid.whatsapp.dto.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
  private Long selectedFarmLocationId;
  private Double latitude;
  private Double longitude;
  private String googleMapsUrl;
  private Boolean isGeoLocation;
  private BigDecimal dailyRate;
  private Long selectedRentalConfigId;
  private String selectedBillingUnit;
  private String selectedShiftTerms;
  private List<Long> availableRentalConfigIds;
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

  // ─── Voice Note & Semantic Search Processing ────────────────────────
  private String lastVoiceTranscript;
  private String detectedLanguage;
  private Boolean voiceNoteReceived;
  private Integer voiceRetryCount;
  private List<Long> candidateAssetIds;

  // ─── Damage Checklist (Return Inspection) ───────────────────────────
  private Integer checklistCurrentItemIndex;
  private Map<String, String> checklistItemPhotos;
  private Map<String, String> checklistItemStatuses;
  private Boolean checklistCompleted;
  private String customerDamageDescription;
}
