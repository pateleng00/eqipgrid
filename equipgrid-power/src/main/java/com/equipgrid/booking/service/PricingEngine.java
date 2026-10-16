package com.equipgrid.booking.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import org.springframework.stereotype.Component;

@Component
public class PricingEngine {

  public CommercialQuote calculate(
      BigDecimal dailyRate,
      BigDecimal depositAmount,
      LocalDate startDate,
      LocalDate endDate,
      BigDecimal distanceKm,
      boolean operatorRequired) {
    return calculate(
        dailyRate,
        depositAmount,
        BigDecimal.ZERO,
        BigDecimal.ZERO,
        BigDecimal.ZERO,
        startDate,
        endDate,
        distanceKm,
        operatorRequired);
  }

  public CommercialQuote calculate(
      BigDecimal dailyRate,
      BigDecimal depositAmount,
      BigDecimal operatorDailyRate,
      BigDecimal freeKm,
      BigDecimal ratePerKm,
      LocalDate startDate,
      LocalDate endDate,
      BigDecimal distanceKm,
      boolean operatorRequired) {
    long days = ChronoUnit.DAYS.between(startDate, endDate) + 1;
    if (days <= 0) days = 1;

    BigDecimal duration = BigDecimal.valueOf(days);
    BigDecimal baseRent = dailyRate != null ? dailyRate.multiply(duration) : BigDecimal.ZERO;

    BigDecimal opRate = operatorDailyRate != null ? operatorDailyRate : BigDecimal.ZERO;
    BigDecimal opFee = operatorRequired ? opRate.multiply(duration) : BigDecimal.ZERO;

    BigDecimal deliveryFee = calculateDeliveryFee(distanceKm, freeKm, ratePerKm);
    BigDecimal deposit = depositAmount != null ? depositAmount : BigDecimal.ZERO;
    BigDecimal total = baseRent.add(opFee).add(deliveryFee).add(deposit);
    BigDecimal requiredInitial = baseRent.add(deliveryFee).add(deposit);

    CommercialQuote quote = new CommercialQuote();
    quote.durationDays = days;
    quote.baseRent = baseRent;
    quote.operatorFee = opFee;
    quote.deliveryFee = deliveryFee;
    quote.depositAmount = deposit;
    quote.totalAmount = total;
    quote.requiredInitialAmount = requiredInitial;

    return quote;
  }

  public BigDecimal calculateDeliveryFee(BigDecimal distanceKm) {
    return calculateDeliveryFee(distanceKm, BigDecimal.ZERO, BigDecimal.ZERO);
  }

  public BigDecimal calculateDeliveryFee(
      BigDecimal distanceKm, BigDecimal freeKm, BigDecimal ratePerKm) {
    if (distanceKm == null || distanceKm.compareTo(BigDecimal.ZERO) <= 0) {
      return BigDecimal.ZERO;
    }
    if (ratePerKm == null || ratePerKm.compareTo(BigDecimal.ZERO) <= 0) {
      return BigDecimal.ZERO;
    }
    BigDecimal freeThreshold = freeKm != null ? freeKm : BigDecimal.ZERO;

    if (distanceKm.compareTo(freeThreshold) <= 0) {
      return BigDecimal.ZERO;
    }

    BigDecimal chargeableKm = distanceKm.subtract(freeThreshold);
    return chargeableKm.multiply(ratePerKm);
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
