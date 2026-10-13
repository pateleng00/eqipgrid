package com.equipgrid.farmlocation.entity;

import com.equipgrid.common.BaseEntity;
import com.equipgrid.customer.entity.Customer;
import com.equipgrid.farmlocation.enums.FarmLocationType;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "farm_locations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FarmLocation extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "local_name", nullable = false, length = 128)
    private String localName;

    @Column(name = "local_name_hindi", length = 128)
    private String localNameHindi;

    @Column(columnDefinition = "TEXT")
    private String aliases;

    @Column(name = "location_type", nullable = false)
    @Builder.Default
    private FarmLocationType locationType = FarmLocationType.FARM;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(length = 128)
    private String village;

    @Column(length = 128)
    private String tehsil;

    @Column(length = 128)
    private String district;

    @Column(columnDefinition = "TEXT")
    private String landmark;

    @Column(name = "access_notes", columnDefinition = "TEXT")
    private String accessNotes;

    @Column(name = "delivery_contact_name", length = 128)
    private String deliveryContactName;

    @Column(name = "delivery_contact_phone", length = 20)
    private String deliveryContactPhone;

    @Column(name = "is_default", nullable = false)
    @Builder.Default
    private Boolean isDefault = false;

    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "verified_by", length = 128)
    private String verifiedBy;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    public String displayAddress() {
        StringBuilder address = new StringBuilder(localName);
        if (landmark != null && !landmark.isBlank()) address.append(" — ").append(landmark);
        else if (village != null && !village.isBlank()) address.append(" — ").append(village);
        return address.toString();
    }
}
