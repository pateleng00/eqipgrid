package com.equipgrid.maintenance.entity;

import com.equipgrid.common.BaseEntity;
import com.equipgrid.master.entity.EquipmentType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "maintenance_damage_components")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaintenanceDamageComponent extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.EAGER)
  @JoinColumn(name = "equipment_type_id")
  private EquipmentType equipmentType;

  @Builder.Default
  @Column(name = "is_universal")
  private Boolean isUniversal = false;

  @Column(name = "part_code", nullable = false, length = 64)
  private String partCode;

  @Column(name = "name", nullable = false, length = 128)
  private String name;

  @Column(name = "hindi_name", length = 128)
  private String hindiName;

  @Column(name = "category", length = 64)
  private String category;

  @Column(name = "description", columnDefinition = "TEXT")
  private String description;

  @Builder.Default
  @Column(name = "display_order")
  private Integer displayOrder = 0;

  @Builder.Default
  @Column(name = "active")
  private Boolean active = true;
}
