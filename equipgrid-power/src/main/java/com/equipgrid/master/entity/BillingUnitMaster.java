package com.equipgrid.master.entity;

import com.equipgrid.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "billing_units")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BillingUnitMaster extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 32)
    private String code;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(name = "hindi_name", nullable = false, length = 128)
    private String hindiName;

    @Column(name = "unit_label", nullable = false, length = 32)
    private String unitLabel;

    @Column(name = "hindi_unit_label", nullable = false, length = 32)
    private String hindiUnitLabel;

    @Column(name = "unit_label_long", length = 64)
    private String unitLabelLong;

    @Column(name = "hindi_unit_label_long", length = 64)
    private String hindiUnitLabelLong;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "hindi_description", columnDefinition = "TEXT")
    private String hindiDescription;

    @Column(name = "default_shift_terms", length = 256)
    private String defaultShiftTerms;

    @Column(name = "hindi_default_shift_terms", length = 256)
    private String hindiDefaultShiftTerms;

    @Builder.Default
    @Column(name = "display_order")
    private Integer displayOrder = 0;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;
}
