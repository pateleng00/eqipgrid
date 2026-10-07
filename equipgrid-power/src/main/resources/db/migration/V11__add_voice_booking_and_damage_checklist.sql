-- V11: WhatsApp Voice Booking & Damage Checklist Support
-- Adds voice_transcript_log table and expands whatsapp_conversations
-- for new state values (PROCESSING_VOICE=12, DAMAGE_CHECKLIST_ACTIVE=13)

-- ─── Voice Transcript Log ────────────────────────────────────────────────────
-- Stores transcription results from voice note processing for audit and
-- quality monitoring of the Gemini STT pipeline.
CREATE TABLE IF NOT EXISTS whatsapp_voice_transcripts (
    id                   BIGSERIAL PRIMARY KEY,
    phone_number         VARCHAR(20)  NOT NULL,
    customer_id          BIGINT       REFERENCES customers(id),
    booking_id           BIGINT       REFERENCES bookings(id),
    raw_audio_url        TEXT,
    mime_type            VARCHAR(64),
    transcript_text      TEXT,
    detected_language    VARCHAR(10),
    parsed_intent        VARCHAR(50),
    parsed_category      VARCHAR(30),
    parsed_rental_days   INTEGER,
    parsed_hub_hint      VARCHAR(100),
    transcription_ok     BOOLEAN      DEFAULT FALSE,
    fallback_reason      TEXT,
    gemini_model_used    VARCHAR(100),
    processing_ms        INTEGER,
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_voice_phone   ON whatsapp_voice_transcripts(phone_number);
CREATE INDEX IF NOT EXISTS idx_wa_voice_created ON whatsapp_voice_transcripts(created_at);

-- ─── Damage Checklist Audit ───────────────────────────────────────────────────
-- Stores the completed damage checklist responses per booking return.
CREATE TABLE IF NOT EXISTS whatsapp_damage_checklists (
    id               BIGSERIAL PRIMARY KEY,
    booking_id       BIGINT NOT NULL REFERENCES bookings(id),
    phone_number     VARCHAR(20) NOT NULL,
    checklist_json   TEXT,                   -- Full JSON of item statuses
    photos_json      TEXT,                   -- JSON map of item key → photo URL
    items_ok         INTEGER DEFAULT 0,
    items_damaged    INTEGER DEFAULT 0,
    items_missing    INTEGER DEFAULT 0,
    completed_at     TIMESTAMP DEFAULT NOW(),
    created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_checklist_booking ON whatsapp_damage_checklists(booking_id);
CREATE INDEX IF NOT EXISTS idx_wa_checklist_phone   ON whatsapp_damage_checklists(phone_number);

-- ─── Comment: WhatsApp conversation state values reference ───────────────────
-- State 12 = PROCESSING_VOICE   (temporary state during async voice transcription)
-- State 13 = DAMAGE_CHECKLIST_ACTIVE (interactive 8-point return damage checklist)
-- These values are already supported by the JPA AttributeConverter in WhatsAppState enum.
COMMENT ON TABLE whatsapp_voice_transcripts   IS 'Audit log of all Gemini voice note transcriptions for WhatsApp voice booking';
COMMENT ON TABLE whatsapp_damage_checklists  IS 'Completed damage inspection checklists submitted via WhatsApp during equipment return';
