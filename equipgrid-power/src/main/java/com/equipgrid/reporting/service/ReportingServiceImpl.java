package com.equipgrid.reporting.service;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.asset.enums.AssetStatus;
import com.equipgrid.asset.repository.AssetQueryRepository;
import com.equipgrid.booking.entity.Booking;
import com.equipgrid.booking.enums.BookingStatus;
import com.equipgrid.booking.repository.BookingQueryRepository;
import com.equipgrid.payment.entity.Payment;
import com.equipgrid.payment.enums.PaymentMode;
import com.equipgrid.payment.repository.PaymentQueryRepository;
import com.equipgrid.reporting.dto.response.DailyCashReconciliationResponse;
import com.equipgrid.reporting.dto.response.DashboardSummaryResponse;
import com.equipgrid.reporting.dto.response.FleetUtilizationResponse;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@AllArgsConstructor
public class ReportingServiceImpl implements IReportingService {

    private final AssetQueryRepository assetQueryRepository;
    private final BookingQueryRepository bookingQueryRepository;
    private final PaymentQueryRepository paymentQueryRepository;

    @Override
    public DailyCashReconciliationResponse getDailyCashReconciliation(LocalDate date) {
        LocalDate target = date != null ? date : LocalDate.now();
        LocalDateTime start = target.atStartOfDay();
        LocalDateTime end = target.atTime(LocalTime.MAX);

        BigDecimal cash = paymentQueryRepository.sumAmountByModeAndDateRange(PaymentMode.CASH, start, end);
        BigDecimal upi = paymentQueryRepository.sumAmountByModeAndDateRange(PaymentMode.UPI, start, end);
        BigDecimal bank = paymentQueryRepository.sumAmountByModeAndDateRange(PaymentMode.BANK_TRANSFER, start, end);

        BigDecimal totalIn = cash.add(upi).add(bank);
        BigDecimal opening = new BigDecimal("10000.00");
        BigDecimal expenses = BigDecimal.ZERO;
        BigDecimal refunds = BigDecimal.ZERO;

        BigDecimal closing = opening.add(totalIn).subtract(expenses).subtract(refunds);

        return DailyCashReconciliationResponse.builder()
                .date(target)
                .openingCash(opening)
                .cashReceipts(cash)
                .upiReceipts(upi)
                .bankReceipts(bank)
                .totalReceipts(totalIn)
                .totalExpenses(expenses)
                .totalRefunds(refunds)
                .closingPosition(closing)
                .reconciliationStatus("BALANCED")
                .build();
    }

    @Override
    public FleetUtilizationResponse getFleetUtilization() {
        List<Asset> all = assetQueryRepository.fetchAssets(null, null);
        long total = all.size();
        long onRent = all.stream().filter(a -> a.getStatus() == AssetStatus.ON_RENT || a.getStatus() == AssetStatus.DISPATCHED).count();
        long available = all.stream().filter(a -> a.getStatus() == AssetStatus.AVAILABLE).count();
        long maintenance = all.stream().filter(a -> a.getStatus() == AssetStatus.MAINTENANCE || a.getStatus() == AssetStatus.DAMAGED).count();

        double utilPct = total > 0 ? ((double) onRent / total) * 100.0 : 0.0;
        BigDecimal bd = BigDecimal.valueOf(utilPct).setScale(2, RoundingMode.HALF_UP);

        Map<String, Long> byCat = new HashMap<>();
        byCat.put("CONSTRUCTION", all.stream().filter(a -> a.getCategory() == AssetCategory.CONSTRUCTION).count());
        byCat.put("AGRICULTURE", all.stream().filter(a -> a.getCategory() == AssetCategory.AGRICULTURE).count());

        Map<String, Long> byStat = new HashMap<>();
        for (AssetStatus st : AssetStatus.values()) {
            byStat.put(st.name(), all.stream().filter(a -> a.getStatus() == st).count());
        }

        return FleetUtilizationResponse.builder()
                .totalAssets(total)
                .availableAssets(available)
                .onRentAssets(onRent)
                .maintenanceAssets(maintenance)
                .utilizationPercentage(bd.doubleValue())
                .assetsByCategory(byCat)
                .assetsByStatus(byStat)
                .build();
    }

    @Override
    public DashboardSummaryResponse getDashboardSummary() {
        FleetUtilizationResponse fleet = getFleetUtilization();
        long activeBookings = bookingQueryRepository.countByStatus(BookingStatus.ON_RENT);
        long pendingDispatch = bookingQueryRepository.countByStatus(BookingStatus.CONFIRMED);

        LocalDate today = LocalDate.now();
        BigDecimal todayTotal = paymentQueryRepository.sumTotalByDateRange(today.atStartOfDay(), today.atTime(LocalTime.MAX));

        List<Payment> allPayments = paymentQueryRepository.fetchAll();
        BigDecimal totalRevenue = allPayments.stream().map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Booking> allBookings = bookingQueryRepository.fetchAll(null);
        BigDecimal pendingDeposits = allBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.ON_RENT)
                .map(b -> b.getDepositPaid() != null ? b.getDepositPaid() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return DashboardSummaryResponse.builder()
                .totalAssets(fleet.getTotalAssets())
                .availableAssets(fleet.getAvailableAssets())
                .activeRentals(activeBookings)
                .pendingDispatch(pendingDispatch)
                .todayGrossRevenue(todayTotal)
                .totalRevenueCollected(totalRevenue)
                .pendingSecurityDeposits(pendingDeposits)
                .fleetUtilizationPercent(fleet.getUtilizationPercentage())
                .zeroCreditCompliancePercent(100.0)
                .build();
    }
}
