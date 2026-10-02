-- EquipGrid V3: WhatsApp Conversational Service Schema
-- Enables rural/village farmers to browse, quote, book, pay via UPI QR, track, and return machinery using mobile phone identity

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id BIGSERIAL PRIMARY KEY,
    phone_number VARCHAR(30) UNIQUE NOT NULL,
    state SMALLINT NOT NULL DEFAULT 1, -- WhatsAppState enum: 1=MAIN_MENU, 2=SELECTING_CATEGORY, 3=SELECTING_ASSET, 4=ENTERING_DATES, 5=ENTERING_LOCATION, 6=CONFIRMING_BOOKING, 7=AWAITING_PAYMENT, 8=TRACKING_ORDER, 9=REQUESTING_RETURN
    context_data TEXT,
    last_message_received TEXT,
    last_interaction_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conv_phone ON whatsapp_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conv_state ON whatsapp_conversations(state);
