package com.equipgrid.rentalconfig.entity;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.enums.BillingUnit;
import com.equipgrid.common.BaseEntity;
import com.equipgrid.location.entity.Hub;
import com.equipgrid.master.entity.BillingUnitMaster;
import com.equipgrid.master.entity.EquipmentType;
import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.*;

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

  @Column(name = "operator_daily_rate", precision = 10, scale = 2)
  private BigDecimal operatorDailyRate;

  @Column(name = "free_delivery_distance_km", precision = 6, scale = 2)
  private BigDecimal freeDeliveryDistanceKm;

  @Column(name = "rate_per_km_after_free", precision = 10, scale = 2)
  private BigDecimal ratePerKmAfterFree;

  @Column(name = "billing_unit")
  private BillingUnit billingUnit;

  @ManyToOne(fetch = FetchType.EAGER)
  @JoinColumn(name = "billing_unit_id")
  private BillingUnitMaster billingUnitMaster;

  @Column(name = "working_hours_limit", precision = 6, scale = 2)
  private BigDecimal workingHoursLimit;

  @Column(name = "shift_terms", length = 256)
  private String shiftTerms;

  @Builder.Default
  @Column(nullable = false)
  private Boolean active = true;

  @Column(columnDefinition = "TEXT")
  private String notes;
}
