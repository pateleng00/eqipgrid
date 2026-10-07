package com.equipgrid.location.entity;

import com.equipgrid.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "hubs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Hub extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "city_id", nullable = false)
    private City city;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(nullable = false, unique = true, length = 32)
    private String code;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String address;

    @Column(name = "contact_phone", length = 20)
    private String contactPhone;

    @Builder.Default
    @Column(name = "operating_radius_km", precision = 6, scale = 2)
    private BigDecimal operatingRadiusKm = new BigDecimal("25.00");

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal longitude;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;
}
