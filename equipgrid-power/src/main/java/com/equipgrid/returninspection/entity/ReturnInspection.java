package com.equipgrid.returninspection.entity;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.enums.AssetStatus;
import com.equipgrid.booking.entity.Booking;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "return_inspections")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReturnInspection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "asset_id", nullable = false)
    private Asset asset;

    @Column(name = "return_timestamp")
    @Builder.Default
    private LocalDateTime returnTimestamp = LocalDateTime.now();

    @Column(name = "fuel_level_return", length = 32)
    @Builder.Default
    private String fuelLevelReturn = "100%";

    @Column(name = "fuel_delta_charge", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal fuelDeltaCharge = BigDecimal.ZERO;

    @Column(name = "engine_hours_in", precision = 8, scale = 2)
    @Builder.Default
    private BigDecimal engineHoursIn = BigDecimal.ZERO;

    @Column(name = "accessories_returned_ok")
    @Builder.Default
    private Boolean accessoriesReturnedOk = true;

    @Column(name = "has_damage")
    @Builder.Default
    private Boolean hasDamage = false;

    @Column(name = "damage_cost", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal damageCost = BigDecimal.ZERO;

    @Column(name = "damage_description", columnDefinition = "TEXT")
    private String damageDescription;

    @Column(name = "inspector_name", nullable = false, length = 128)
    private String inspectorName;

    @Column(name = "next_action", nullable = false)
    @Builder.Default
    private AssetStatus nextAction = AssetStatus.AVAILABLE;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
