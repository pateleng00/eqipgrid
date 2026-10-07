package com.equipgrid.whatsapp.dto.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Structured result of voice note transcription and intent extraction.
 * Produced by {@link com.equipgrid.whatsapp.service.VoiceNoteProcessingService}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class VoiceBookingIntent {

    /** Raw transcribed text (in original language, e.g. Hindi) */
    private String transcript;

    /** English translation of the transcript (if different from original) */
    private String transcriptEnglish;

    /** ISO 639-1 language code detected ("hi", "en", "bho", etc.) */
    private String detectedLanguage;

    /**
     * High-level booking intent classified from voice.
     * One of: BROWSE_RENT, TRACK_ORDER, PAY, RETURN, HELP, UNKNOWN
     */
    private String intent;

    /** Equipment category if mentioned: "AGRICULTURE" or "CONSTRUCTION" */
    private String assetCategory;

    /** Specific machine name if mentioned (e.g. "reaper", "concrete mixer") */
    private String machineNameHint;

    /** Number of rental days if explicitly mentioned */
    private Integer rentalDays;

    /** Hub/city name if mentioned (e.g. "Hardoi", "Lucknow") */
    private String hubNameHint;

    /** Delivery type if mentioned: "HOME", "FARM", or "SITE" */
    private String deliveryType;

    /** Whether transcription was successfully performed */
    private boolean transcriptionSucceeded;

    /** Reason for failure if transcription did not succeed */
    private String fallbackReason;
}
