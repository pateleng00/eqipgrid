package com.equipgrid.booking.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum BookingStatus {
    NA((short) 0),
    QUOTED((short) 1),
    PENDING_PAYMENT((short) 2),
    CONFIRMED((short) 3),
    ALLOCATED((short) 4),
    DISPATCH_READY((short) 5),
    DISPATCHED((short) 6),
    ON_RENT((short) 7),
    RETURN_REQUESTED((short) 8),
    RETURNED((short) 9),
    INSPECTED((short) 10),
    CLOSED((short) 11),
    CANCELLED((short) 12);

    @JsonValue
    private final Short value;

    BookingStatus(short value) {
        this.value = value;
    }

    public static BookingStatus fromValue(Short value) {
        if (value == null) {
            return NA;
        }
        for (BookingStatus status : BookingStatus.values()) {
            if (status.getValue() != null && status.getValue().equals(value)) {
                return status;
            }
        }
        return NA;
    }

    public static BookingStatus fromValue(String value) {
        if (value == null) {
            return NA;
        }
        for (BookingStatus status : BookingStatus.values()) {
            if (status.name().equalsIgnoreCase(value) || String.valueOf(status.getValue()).equalsIgnoreCase(value)) {
                return status;
            }
        }
        return NA;
    }

    @JsonCreator
    public static BookingStatus jsonCreator(Object obj) {
        if (obj == null) return NA;
        if (obj instanceof Number num) {
            return fromValue(num.shortValue());
        }
        return fromValue(obj.toString());
    }

    @Converter(autoApply = true)
    public static class JpaConverter implements AttributeConverter<BookingStatus, Short> {
        @Override
        public Short convertToDatabaseColumn(BookingStatus status) {
            return status == null ? null : status.getValue();
        }

        @Override
        public BookingStatus convertToEntityAttribute(Short value) {
            return BookingStatus.fromValue(value);
        }
    }
}
