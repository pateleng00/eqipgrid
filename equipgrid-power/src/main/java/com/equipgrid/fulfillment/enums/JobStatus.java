package com.equipgrid.fulfillment.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.Getter;

@Getter
public enum JobStatus {
    NA((short) 0, "Not Applicable"),
    REQUESTED((short) 1, "Fulfillment Job Requested (अनुरोध दर्ज)"),
    SCHEDULED((short) 2, "Logistics Slot Scheduled (शेड्यूल किया गया)"),
    OUT_FOR_DELIVERY((short) 3, "Out For Delivery / En Route (रास्ते में है)"),
    COMPLETED((short) 4, "Fulfillment Completed (पूर्ण हुआ)"),
    CANCELLED((short) 5, "Fulfillment Cancelled (रद्द किया गया)");

    @JsonValue
    private final Short value;
    private final String description;

    JobStatus(short value, String description) {
        this.value = value;
        this.description = description;
    }

    public static JobStatus fromValue(Short value) {
        if (value == null) {
            return NA;
        }
        for (JobStatus s : JobStatus.values()) {
            if (s.getValue() != null && s.getValue().equals(value)) {
                return s;
            }
        }
        return NA;
    }

    public static JobStatus fromValue(String value) {
        if (value == null) {
            return NA;
        }
        for (JobStatus s : JobStatus.values()) {
            if (s.name().equalsIgnoreCase(value) || String.valueOf(s.getValue()).equalsIgnoreCase(value)) {
                return s;
            }
        }
        return NA;
    }

    @JsonCreator
    public static JobStatus jsonCreator(Object obj) {
        if (obj == null) return NA;
        if (obj instanceof Number num) {
            return fromValue(num.shortValue());
        }
        return fromValue(obj.toString());
    }

    @Converter(autoApply = true)
    public static class JpaConverter implements AttributeConverter<JobStatus, Short> {
        @Override
        public Short convertToDatabaseColumn(JobStatus attribute) {
            return attribute == null ? null : attribute.getValue();
        }

        @Override
        public JobStatus convertToEntityAttribute(Short dbData) {
            return JobStatus.fromValue(dbData);
        }
    }
}
