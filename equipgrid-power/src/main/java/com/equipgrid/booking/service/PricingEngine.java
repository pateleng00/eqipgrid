package com.equipgrid.booking.service;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@Component
public class PricingEngine {

    public static final BigDecimal OPERATOR_DAILY_RATE = new BigDecimal("500.00");

    public CommercialQuote calculate(BigDecimal dailyRate, BigDecimal depositAmount,
                                     LocalDate startDate, LocalDate endDate,
                                     BigDecimal distanceKm, boolean operatorRequired) {
        long days = ChronoUnit.DAYS.between(startDate, endDate);
        if (days <= 0) days = 1;

        BigDecimal duration = BigDecimal.valueOf(days);
        BigDecimal baseRent = dailyRate.multiply(duration);

        BigDecimal opFee = operatorRequired
                ? OPERATOR_DAILY_RATE.multiply(duration)
                : BigDecimal.ZERO;

        BigDecimal deliveryFee = calculateDeliveryFee(distanceKm);
        BigDecimal total = baseRent.add(opFee).add(deliveryFee).add(depositAmount);
        BigDecimal requiredInitial = baseRent.add(deliveryFee).add(depositAmount);

        CommercialQuote quote = new CommercialQuote();
        quote.durationDays = days;
        quote.baseRent = baseRent;
        quote.operatorFee = opFee;
        quote.deliveryFee = deliveryFee;
        quote.depositAmount = depositAmount;
        quote.totalAmount = total;
        quote.requiredInitialAmount = requiredInitial;

        return quote;
    }

    public static final BigDecimal DEFAULT_FREE_DISTANCE_KM = new BigDecimal("5.00");
    public static final BigDecimal DEFAULT_RATE_PER_KM = new BigDecimal("10.00");

    public BigDecimal calculateDeliveryFee(BigDecimal distanceKm) {
        return calculateDeliveryFee(distanceKm, DEFAULT_FREE_DISTANCE_KM, DEFAULT_RATE_PER_KM);
    }

    public BigDecimal calculateDeliveryFee(BigDecimal distanceKm, BigDecimal freeKm, BigDecimal ratePerKm) {
        if (distanceKm == null || distanceKm.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal freeThreshold = freeKm != null ? freeKm : DEFAULT_FREE_DISTANCE_KM;
        BigDecimal rate = ratePerKm != null ? ratePerKm : DEFAULT_RATE_PER_KM;

        if (distanceKm.compareTo(freeThreshold) <= 0) {
            // Free pick and drop within free distance threshold (e.g. 5 KM)
            return BigDecimal.ZERO;
        }

        // Chargeable distance beyond free threshold
        BigDecimal chargeableKm = distanceKm.subtract(freeThreshold);
        return chargeableKm.multiply(rate);
    }

    public static class CommercialQuote {
        public long durationDays;
        public BigDecimal baseRent;
        public BigDecimal deliveryFee;
        public BigDecimal operatorFee;
        public BigDecimal depositAmount;
        public BigDecimal totalAmount;
        public BigDecimal requiredInitialAmount;
    }
}
