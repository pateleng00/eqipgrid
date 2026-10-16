package com.equipgrid.asset.entity;

import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.asset.enums.AssetStatus;
import com.equipgrid.asset.enums.BillingUnit;
import com.equipgrid.common.BaseEntity;
import com.equipgrid.location.entity.Hub;
import com.equipgrid.master.entity.EquipmentType;
import com.equipgrid.master.entity.MachineModel;
import com.equipgrid.master.entity.Manufacturer;
import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.*;

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

  @Column(name = "category", nullable = false)
  private AssetCategory category;

  @Column(name = "name")
  private String name;

  @Column(name = "model_name")
  private String modelName;

  @Column(name = "image_url", nullable = false, length = 512)
  private String imageUrl;

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

  @Builder.Default
  @Column(name = "billing_unit")
  private BillingUnit billingUnit = BillingUnit.DAILY;

  @ManyToOne(fetch = FetchType.EAGER)
  @JoinColumn(name = "billing_unit_id")
  private com.equipgrid.master.entity.BillingUnitMaster billingUnitMaster;

  @Column(name = "working_hours_limit", precision = 6, scale = 2)
  private BigDecimal workingHoursLimit;

  @Column(name = "shift_terms", length = 256)
  private String shiftTerms;

  /** Associated media items (images and video) populated dynamically. */
  @Transient private java.util.List<AssetMedia> mediaItems;

  public String getName() {
    if (this.name != null && !this.name.isBlank()) {
      return this.name;
    }
    return this.model != null ? this.model.getName() : null;
  }

  public String getModelName() {
    if (this.model != null && this.model.getName() != null) {
      return this.model.getName();
    }
    return this.modelName;
  }

  public AssetCategory getCategory() {
    if (this.category != null) {
      return this.category;
    }
    return this.type != null ? this.type.getCategory() : null;
  }

  public String getHindiName() {
    return this.type != null ? this.type.getHindiName() : null;
  }

  public String getLocalLanguageName() {
    return this.type != null ? this.type.getLocalLanguageName() : null;
  }

  public String getHindiDescription() {
    return this.type != null ? this.type.getHindiDescription() : null;
  }

  public String getDescription() {
    return this.type != null ? this.type.getDescription() : null;
  }

  @PrePersist
  @PreUpdate
  public void ensureDefaults() {
    if (this.category == null) {
      if (this.type != null && this.type.getCategory() != null) {
        this.category = this.type.getCategory();
      } else if (this.model != null
          && this.model.getType() != null
          && this.model.getType().getCategory() != null) {
        this.category = this.model.getType().getCategory();
      } else {
        this.category = AssetCategory.CONSTRUCTION;
      }
    }
    if (this.name == null || this.name.isBlank()) {
      if (this.model != null && this.model.getName() != null) {
        this.name = this.model.getName();
      } else if (this.type != null && this.type.getName() != null) {
        this.name = this.type.getName();
      } else if (this.assetTag != null) {
        this.name = this.assetTag;
      }
    }
    if (this.modelName == null || this.modelName.isBlank()) {
      if (this.model != null && this.model.getName() != null) {
        this.modelName = this.model.getName();
      }
    }
    if (this.imageUrl == null || this.imageUrl.isBlank()) {
      this.imageUrl = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800";
    }
  }
}
