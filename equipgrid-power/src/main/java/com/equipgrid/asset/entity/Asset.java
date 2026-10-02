package com.equipgrid.asset.entity;

import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.asset.enums.AssetStatus;
import com.equipgrid.common.BaseEntity;
import com.equipgrid.location.entity.Hub;
import com.equipgrid.master.entity.EquipmentType;
import com.equipgrid.master.entity.MachineModel;
import com.equipgrid.master.entity.Manufacturer;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "assets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Asset extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "asset_tag", nullable = false, unique = true, length = 32)
    private String assetTag;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(nullable = false)
    private AssetCategory category;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "type_id")
    private EquipmentType type;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "manufacturer_id")
    private Manufacturer manufacturer;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "model_id")
    private MachineModel model;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "hub_id")
    private Hub hub;

    @Builder.Default
    @Column(name = "image_url", nullable = false, length = 512)
    private String imageUrl = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800";

    @Column(name = "model_name", length = 128)
    private String modelName;

    @Column(name = "serial_number", length = 128)
    private String serialNumber;

    @Column(name = "daily_rate", nullable = false, precision = 10, scale = 2)
    private BigDecimal dailyRate;

    @Column(name = "deposit_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal depositAmount;

    @Column(name = "purchase_cost", precision = 10, scale = 2)
    private BigDecimal purchaseCost;

    @Builder.Default
    @Column(name = "operator_required")
    private Boolean operatorRequired = false;

    @Builder.Default
    @Column(nullable = false)
    private AssetStatus status = AssetStatus.AVAILABLE;

    @Column(name = "condition_notes", columnDefinition = "TEXT")
    private String conditionNotes;

    @Builder.Default
    @Column(name = "engine_hours", precision = 8, scale = 2)
    private BigDecimal engineHours = BigDecimal.ZERO;

    @Column(name = "accessories_included", columnDefinition = "TEXT")
    private String accessoriesIncluded;

    /**
     * Associated media items (images and video) populated dynamically.
     */
    @Transient
    private java.util.List<AssetMedia> mediaItems;
}
