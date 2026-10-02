package com.equipgrid.master.entity;

import com.equipgrid.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "machine_models", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"type_id", "manufacturer_id", "model_number"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MachineModel extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "type_id", nullable = false)
    private EquipmentType type;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "manufacturer_id", nullable = false)
    private Manufacturer manufacturer;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(name = "model_number", nullable = false, length = 64)
    private String modelNumber;

    @Column(columnDefinition = "TEXT")
    private String specs;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;
}
