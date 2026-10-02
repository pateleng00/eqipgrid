package com.equipgrid.customer.entity;

import com.equipgrid.common.BaseEntity;
import com.equipgrid.customer.enums.CustomerTier;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "customers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Customer extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false, length = 128)
    private String fullName;

    @Column(nullable = false, unique = true, length = 20)
    private String phone;

    @Column(length = 128)
    private String email;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String address;

    @Column(name = "aadhaar_number", length = 20)
    private String aadhaarNumber;

    @Column(name = "gst_number", length = 30)
    private String gstNumber;

    @Builder.Default
    @Column(nullable = false)
    private CustomerTier tier = CustomerTier.TIER_1_BASIC;

    @Builder.Default
    @Column(nullable = false)
    private Boolean verified = false;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
