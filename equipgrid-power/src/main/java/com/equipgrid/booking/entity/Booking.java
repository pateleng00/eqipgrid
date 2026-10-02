package com.equipgrid.booking.entity;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.auth.entity.User;
import com.equipgrid.booking.enums.BookingStatus;
import com.equipgrid.common.BaseEntity;
import com.equipgrid.customer.entity.Customer;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "bookings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "booking_number", nullable = false, unique = true, length = 32)
    private String bookingNumber;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "asset_id", nullable = false)
    private Asset asset;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "delivery_address", nullable = false, columnDefinition = "TEXT")
    private String deliveryAddress;

    @Builder.Default
    @Column(name = "distance_km", precision = 6, scale = 2)
    private BigDecimal distanceKm = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "operator_required")
    private Boolean operatorRequired = false;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "operator_assigned_id")
    private User operatorAssigned;

    @Column(name = "base_rent", nullable = false, precision = 10, scale = 2)
    private BigDecimal baseRent;

    @Column(name = "delivery_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal deliveryFee;

    @Column(name = "operator_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal operatorFee;

    @Column(name = "deposit_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal depositAmount;

    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Builder.Default
    @Column(name = "advance_paid", precision = 10, scale = 2)
    private BigDecimal advancePaid = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "deposit_paid", precision = 10, scale = 2)
    private BigDecimal depositPaid = BigDecimal.ZERO;

    @Builder.Default
    @Column(nullable = false)
    private BookingStatus status = BookingStatus.QUOTED;

    @Column(name = "dealer_id")
    private Long dealerId;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
