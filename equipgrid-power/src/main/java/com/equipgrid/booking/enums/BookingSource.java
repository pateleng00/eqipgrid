package com.equipgrid.booking.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum BookingSource {
    NA((short) 0, "Not Applicable"),
    STATION((short) 1, "Hub Booking Desk (केंद्र बुकिंग काउंटर)"),
    PHONE_AGENT((short) 2, "Phone Booking Agent (फोन बुकिंग एजेंट)"),
    DEALER((short) 3, "Village Dealer (ग्राम डीलर)"),
    FPO((short) 4, "FPO Partner (एफपीओ साझेदार)"),
    KISAN_MITRA((short) 5, "Kisan Mitra (किसान मित्र)"),
    WHATSAPP((short) 6, "WhatsApp Bot (व्हाट्सएप सेवा)"),
    WEBSITE((short) 7, "Public Website (ऑनलाइन वेबसाइट)");

    @JsonValue
    private final Short value;
    private final String description;

    BookingSource(short value, String description) {
        this.value = value;
        this.description = description;
    }

    public static BookingSource fromValue(Short value) {
        if (value == null) {
            return NA;
        }
        for (BookingSource s : BookingSource.values()) {
            if (s.getValue() != null && s.getValue().equals(value)) {
                return s;
            }
        }
        return NA;
    }

    public static BookingSource fromValue(String value) {
        if (value == null) {
            return NA;
        }
        for (BookingSource s : BookingSource.values()) {
            if (s.name().equalsIgnoreCase(value) || String.valueOf(s.getValue()).equalsIgnoreCase(value)) {
                return s;
            }
        }
        return NA;
    }

    @JsonCreator
    public static BookingSource jsonCreator(Object obj) {
        if (obj == null) return NA;
        if (obj instanceof Number num) {
            return fromValue(num.shortValue());
        }
        return fromValue(obj.toString());
    }

    @Converter(autoApply = true)
    public static class JpaConverter implements AttributeConverter<BookingSource, Short> {
        @Override
        public Short convertToDatabaseColumn(BookingSource attribute) {
            return attribute == null ? null : attribute.getValue();
        }

        @Override
        public BookingSource convertToEntityAttribute(Short dbData) {
            return BookingSource.fromValue(dbData);
        }
    }
}
