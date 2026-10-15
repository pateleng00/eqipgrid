package com.equipgrid.booking.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum BookingStatus {
  QUOTED((short) 1, "Quotation Generated (कोटेशन तैयार)"),
  PENDING_PAYMENT((short) 2, "Pending Advance Payment (अग्रिम भुगतान लंबित)"),
  CONFIRMED((short) 3, "Booking Confirmed (बुकिंग पक्की)"),
  ALLOCATED((short) 4, "Machinery Allocated (मशीन आवंटित)"),
  DISPATCH_READY((short) 5, "Dispatch Ready (भेजने के लिए तैयार)"),
  DISPATCHED((short) 6, "Dispatched (यार्ड से रवाना)"),
  ON_RENT((short) 7, "On Rent (खेत पर कार्यरत)"),
  RETURN_REQUESTED((short) 8, "Return Pickup Requested (वापसी अनुरोध दर्ज)"),
  RETURNED((short) 9, "Returned to Yard (यार्ड में वापस)"),
  INSPECTED((short) 10, "Return Inspection Completed (जांच पूर्ण)"),
  CLOSED((short) 11, "Account Settled (खाता बंद)"),
  CANCELLED((short) 12, "Cancelled (रद्द)");

  @JsonValue private final Short value;
  private final String description;

  BookingStatus(short value, String description) {
    this.value = value;
    this.description = description;
  }

  public static BookingStatus fromValue(Short value) {
    if (value == null) {
      return null;
    }
    for (BookingStatus status : BookingStatus.values()) {
      if (status.getValue() != null && status.getValue().equals(value)) {
        return status;
      }
    }
    return null;
  }

  public static BookingStatus fromValue(String value) {
    if (value == null) {
      return null;
    }
    for (BookingStatus status : BookingStatus.values()) {
      if (status.name().equalsIgnoreCase(value)
          || String.valueOf(status.getValue()).equalsIgnoreCase(value)) {
        return status;
      }
    }
    return null;
  }

  @JsonCreator
  public static BookingStatus jsonCreator(Object obj) {
    if (obj == null) return null;
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
