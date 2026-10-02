package com.equipgrid.dispatch.entity;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.booking.entity.Booking;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "dispatch_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DispatchRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "challan_number", nullable = false, unique = true, length = 32)
    private String challanNumber;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "asset_id", nullable = false)
    private Asset asset;

    @Column(name = "dispatch_timestamp")
    @Builder.Default
    private LocalDateTime dispatchTimestamp = LocalDateTime.now();

    @Column(name = "fuel_level", length = 32)
    @Builder.Default
    private String fuelLevel = "100%";

    @Column(name = "engine_hours_out", precision = 8, scale = 2)
    @Builder.Default
    private BigDecimal engineHoursOut = BigDecimal.ZERO;

    @Column(name = "accessories_verified")
    @Builder.Default
    private Boolean accessoriesVerified = true;

    @Column(name = "condition_notes", columnDefinition = "TEXT")
    private String conditionNotes;

    @Column(name = "photo_urls", columnDefinition = "TEXT")
    private String photoUrls;

    @Column(name = "driver_name", length = 128)
    private String driverName;

    @Column(name = "customer_signature_confirmed")
    @Builder.Default
    private Boolean customerSignatureConfirmed = true;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
