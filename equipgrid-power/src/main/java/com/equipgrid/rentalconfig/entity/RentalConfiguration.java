package com.equipgrid.rentalconfig.entity;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.common.BaseEntity;
import com.equipgrid.location.entity.Hub;
import com.equipgrid.master.entity.EquipmentType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "rental_configurations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RentalConfiguration extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "hub_id", nullable = false)
    private Hub hub;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "asset_id")
    private Asset asset;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "type_id")
    private EquipmentType type;

    @Column(name = "base_daily_rate", nullable = false, precision = 10, scale = 2)
    private BigDecimal baseDailyRate;

    @Column(name = "deposit_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal depositAmount;

    @Builder.Default
    @Column(name = "operator_daily_rate", precision = 10, scale = 2)
    private BigDecimal operatorDailyRate = new BigDecimal("500.00");

    @Builder.Default
    @Column(name = "free_delivery_distance_km", nullable = false, precision = 6, scale = 2)
    private BigDecimal freeDeliveryDistanceKm = new BigDecimal("5.00");

    @Builder.Default
    @Column(name = "rate_per_km_after_free", nullable = false, precision = 10, scale = 2)
    private BigDecimal ratePerKmAfterFree = new BigDecimal("10.00");

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
