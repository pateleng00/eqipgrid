package com.equipgrid.master.entity;

import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "equipment_types")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EquipmentType extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 128)
    private String name;

    @Column(nullable = false, unique = true, length = 32)
    private String code;

    @Builder.Default
    @Column(nullable = false)
    private AssetCategory category = AssetCategory.CONSTRUCTION;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;
}
