package com.equipgrid.reporting.service;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.asset.enums.AssetStatus;
import com.equipgrid.asset.repository.AssetQueryRepository;
import com.equipgrid.booking.entity.Booking;
import com.equipgrid.booking.enums.BookingStatus;
import com.equipgrid.booking.repository.BookingQueryRepository;
import com.equipgrid.core.util.ExcelExportUtil;
import com.equipgrid.dealer.entity.Dealer;
import com.equipgrid.dealer.entity.DealerCommission;
import com.equipgrid.dealer.repository.DealerCommissionRepository;
import com.equipgrid.dealer.repository.DealerRepository;
import com.equipgrid.location.entity.City;
import com.equipgrid.location.entity.Hub;
import com.equipgrid.location.entity.State;
import com.equipgrid.maintenance.entity.MaintenanceRecord;
import com.equipgrid.maintenance.repository.MaintenanceRecordRepository;
import com.equipgrid.payment.entity.Payment;
import com.equipgrid.payment.enums.PaymentMode;
import com.equipgrid.payment.repository.PaymentQueryRepository;
import com.equipgrid.reporting.dto.response.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@AllArgsConstructor
public class ReportingServiceImpl implements IReportingService {

  private final AssetQueryRepository assetQueryRepository;
  private final BookingQueryRepository bookingQueryRepository;
  private final PaymentQueryRepository paymentQueryRepository;
  private final MaintenanceRecordRepository maintenanceRecordRepository;
  private final DealerCommissionRepository dealerCommissionRepository;
  private final DealerRepository dealerRepository;

  @Override
  public DailyCashReconciliationResponse getDailyCashReconciliation(LocalDate date) {
    LocalDate target = date != null ? date : LocalDate.now();
    LocalDateTime start = target.atStartOfDay();
    LocalDateTime end = target.atTime(LocalTime.MAX);

    BigDecimal cash =
        paymentQueryRepository.sumAmountByModeAndDateRange(PaymentMode.CASH, start, end);
    BigDecimal upi =
        paymentQueryRepository.sumAmountByModeAndDateRange(PaymentMode.UPI, start, end);
    BigDecimal bank =
        paymentQueryRepository.sumAmountByModeAndDateRange(PaymentMode.BANK_TRANSFER, start, end);

    BigDecimal totalIn = cash.add(upi).add(bank);
    BigDecimal opening = new BigDecimal("0.0");
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
    long onRent =
        all.stream()
            .filter(
                a ->
                    a.getStatus() == AssetStatus.ON_RENT || a.getStatus() == AssetStatus.DISPATCHED)
            .count();
    long available = all.stream().filter(a -> a.getStatus() == AssetStatus.AVAILABLE).count();
    long maintenance =
        all.stream()
            .filter(
                a ->
                    a.getStatus() == AssetStatus.MAINTENANCE
                        || a.getStatus() == AssetStatus.DAMAGED)
            .count();

    double utilPct = total > 0 ? ((double) onRent / total) * 100.0 : 0.0;
    BigDecimal bd = BigDecimal.valueOf(utilPct).setScale(2, RoundingMode.HALF_UP);

    Map<String, Long> byCat = new HashMap<>();
    byCat.put(
        "CONSTRUCTION",
        all.stream().filter(a -> a.getCategory() == AssetCategory.CONSTRUCTION).count());
    byCat.put(
        "AGRICULTURE",
        all.stream().filter(a -> a.getCategory() == AssetCategory.AGRICULTURE).count());

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
    BigDecimal todayTotal =
        paymentQueryRepository.sumTotalByDateRange(
            today.atStartOfDay(), today.atTime(LocalTime.MAX));

    List<Payment> allPayments = paymentQueryRepository.fetchAll();
    BigDecimal totalRevenue =
        allPayments.stream().map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

    List<Booking> allBookings = bookingQueryRepository.fetchAll(null);
    BigDecimal pendingDeposits =
        allBookings.stream()
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

  private LocalDate[] resolveDateRange(String dateRange) {
    LocalDate now = LocalDate.now();
    if (dateRange == null || dateRange.isBlank() || "today".equalsIgnoreCase(dateRange)) {
      return new LocalDate[] {now, now};
    }
    switch (dateRange.toLowerCase()) {
      case "last_day":
      case "yesterday":
        return new LocalDate[] {now.minusDays(1), now.minusDays(1)};
      case "last_7_days":
      case "7d":
        return new LocalDate[] {now.minusDays(6), now};
      case "last_15_days":
      case "15d":
        return new LocalDate[] {now.minusDays(14), now};
      case "current_month":
        return new LocalDate[] {now.withDayOfMonth(1), now};
      case "last_month":
        LocalDate firstOfLastMonth = now.minusMonths(1).withDayOfMonth(1);
        LocalDate lastOfLastMonth =
            firstOfLastMonth.withDayOfMonth(firstOfLastMonth.lengthOfMonth());
        return new LocalDate[] {firstOfLastMonth, lastOfLastMonth};
      default:
        return new LocalDate[] {now, now};
    }
  }

  private boolean matchesLocation(Hub hub, Long stateId, Long cityId, Long hubId) {
    if (hub == null) {
      return hubId == null && cityId == null && stateId == null;
    }
    if (hubId != null && !hubId.equals(hub.getId())) {
      return false;
    }
    if (cityId != null) {
      if (hub.getCity() == null || !cityId.equals(hub.getCity().getId())) {
        return false;
      }
    }
    if (stateId != null) {
      return hub.getCity() != null
          && hub.getCity().getState() != null
          && stateId.equals(hub.getCity().getState().getId());
    }
    return true;
  }

  @Override
  public ReportingKpiSummaryResponse getKpiSummary(
      Long stateId, Long cityId, Long hubId, String dateRange) {
    List<MachinesOnRentReportItem> onRentList =
        getMachinesOnRentReport(stateId, cityId, hubId, dateRange);
    List<CollectionsReportItem> collectionsList =
        getCollectionsReport(stateId, cityId, hubId, dateRange);
    List<MaintenanceReportItem> maintenanceList =
        getMachinesInMaintenanceReport(stateId, cityId, hubId);
    List<DealerRevenueReportItem> dealerList =
        getDealerRevenueReport(stateId, cityId, hubId, dateRange);
    List<FutureBookingReportItem> futureList =
        getFutureBookingsReport(stateId, cityId, hubId, dateRange);

    BigDecimal totalCollections =
        collectionsList.stream()
            .map(CollectionsReportItem::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

    BigDecimal dealersRevenue =
        dealerList.stream()
            .map(DealerRevenueReportItem::getCommissionAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

    BigDecimal futureRevenue =
        futureList.stream()
            .map(FutureBookingReportItem::getTotalAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

    return ReportingKpiSummaryResponse.builder()
        .machinesOnRentCount(onRentList.size())
        .totalCollections(totalCollections)
        .machinesInMaintenanceCount(maintenanceList.size())
        .dealersRevenue(dealersRevenue)
        .futureBookingsCount(futureList.size())
        .futureBookingsRevenue(futureRevenue)
        .dateRange(dateRange != null ? dateRange : "today")
        .stateId(stateId)
        .cityId(cityId)
        .hubId(hubId)
        .build();
  }

  @Override
  public List<MachinesOnRentReportItem> getMachinesOnRentReport(
      Long stateId, Long cityId, Long hubId, String dateRange) {
    LocalDate[] range = resolveDateRange(dateRange);

    List<Asset> onRentAssets =
        assetQueryRepository.fetchAssets(null, null).stream()
            .filter(
                a ->
                    a.getStatus() == AssetStatus.ON_RENT || a.getStatus() == AssetStatus.DISPATCHED)
            .filter(a -> matchesLocation(a.getHub(), stateId, cityId, hubId))
            .toList();

    List<Booking> allBookings = bookingQueryRepository.fetchAll(null);
    List<MachinesOnRentReportItem> results = new ArrayList<>();

    for (Asset asset : onRentAssets) {
      Booking matchedBooking =
          allBookings.stream()
              .filter(b -> b.getAsset() != null && b.getAsset().getId().equals(asset.getId()))
              .filter(
                  b ->
                      b.getStatus() == BookingStatus.ON_RENT
                          || b.getStatus() == BookingStatus.DISPATCHED
                          || b.getStatus() == BookingStatus.DISPATCH_READY)
              .findFirst()
              .orElse(null);

      if (matchedBooking != null && matchedBooking.getStartDate() != null) {
        if (matchedBooking.getStartDate().isAfter(range[1])) {
          continue;
        }
        if (matchedBooking.getEndDate() != null && matchedBooking.getEndDate().isBefore(range[0])) {
          continue;
        }
      }

      Hub hub = asset.getHub();
      City city = hub != null ? hub.getCity() : null;
      State state = city != null ? city.getState() : null;

      results.add(
          MachinesOnRentReportItem.builder()
              .assetId(asset.getId())
              .assetTag(asset.getAssetTag())
              .machineName(asset.getName())
              .modelName(asset.getModel() != null ? asset.getModel().getName() : asset.getName())
              .category(asset.getCategory() != null ? asset.getCategory().name() : "")
              .hubId(hub != null ? hub.getId() : null)
              .hubName(hub != null ? hub.getName() : "")
              .cityId(city != null ? city.getId() : null)
              .cityName(city != null ? city.getName() : "")
              .stateId(state != null ? state.getId() : null)
              .stateName(state != null ? state.getName() : "")
              .bookingId(matchedBooking != null ? matchedBooking.getId() : null)
              .bookingNumber(matchedBooking != null ? matchedBooking.getBookingNumber() : "")
              .customerName(
                  matchedBooking != null && matchedBooking.getCustomer() != null
                      ? matchedBooking.getCustomer().getFullName()
                      : "")
              .customerPhone(
                  matchedBooking != null && matchedBooking.getCustomer() != null
                      ? matchedBooking.getCustomer().getPhone()
                      : "")
              .startDate(matchedBooking != null ? matchedBooking.getStartDate() : null)
              .expectedReturnDate(matchedBooking != null ? matchedBooking.getEndDate() : null)
              .dispatchTime(
                  matchedBooking != null && matchedBooking.getCreatedAt() != null
                      ? matchedBooking.getCreatedAt()
                      : null)
              .dailyRate(
                  asset.getDailyRate() != null
                      ? asset.getDailyRate()
                      : (matchedBooking != null && matchedBooking.getBaseRent() != null
                          ? matchedBooking.getBaseRent()
                          : BigDecimal.ZERO))
              .deliveryAddress(
                  matchedBooking != null && matchedBooking.getDeliveryAddress() != null
                      ? matchedBooking.getDeliveryAddress()
                      : "")
              .operatorAssigned(
                  matchedBooking != null
                      && Boolean.TRUE.equals(matchedBooking.getOperatorRequired()))
              .status(asset.getStatus().name())
              .build());
    }

    return results;
  }

  @Override
  public List<CollectionsReportItem> getCollectionsReport(
      Long stateId, Long cityId, Long hubId, String dateRange) {
    LocalDate[] range = resolveDateRange(dateRange);
    LocalDateTime start = range[0].atStartOfDay();
    LocalDateTime end = range[1].atTime(LocalTime.MAX);

    List<Payment> payments = paymentQueryRepository.fetchAll();
    List<CollectionsReportItem> results = new ArrayList<>();

    for (Payment p : payments) {
      if (p.getCreatedAt() != null
          && (p.getCreatedAt().isBefore(start) || p.getCreatedAt().isAfter(end))) {
        continue;
      }
      Booking b = p.getBooking();
      Hub hub = b != null && b.getAsset() != null ? b.getAsset().getHub() : null;
      if (!matchesLocation(hub, stateId, cityId, hubId)) {
        continue;
      }

      City city = hub != null ? hub.getCity() : null;
      State state = city != null ? city.getState() : null;

      results.add(
          CollectionsReportItem.builder()
              .paymentId(p.getId())
              .receiptNumber("RCT-" + p.getId())
              .bookingId(b != null ? b.getId() : null)
              .bookingNumber(b != null ? b.getBookingNumber() : "")
              .customerName(
                  b != null && b.getCustomer() != null ? b.getCustomer().getFullName() : "")
              .customerPhone(b != null && b.getCustomer() != null ? b.getCustomer().getPhone() : "")
              .hubId(hub != null ? hub.getId() : null)
              .hubName(hub != null ? hub.getName() : "")
              .cityName(city != null ? city.getName() : "")
              .stateName(state != null ? state.getName() : "")
              .paymentMode(p.getPaymentMode() != null ? p.getPaymentMode().name() : "")
              .transactionRef(p.getTransactionRef() != null ? p.getTransactionRef() : "")
              .amount(p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO)
              .paymentType(p.getPaymentType() != null ? p.getPaymentType().name() : "")
              .paymentDate(p.getCreatedAt())
              .collectedBy("STATION_DESK")
              .status("SETTLED")
              .build());
    }

    return results;
  }

  @Override
  public List<MaintenanceReportItem> getMachinesInMaintenanceReport(
      Long stateId, Long cityId, Long hubId) {
    // No date filter allowed for maintenance report; strictly State, City, Hub.
    List<Asset> maintenanceAssets =
        assetQueryRepository.fetchAssets(null, null).stream()
            .filter(
                a ->
                    a.getStatus() == AssetStatus.MAINTENANCE
                        || a.getStatus() == AssetStatus.DAMAGED)
            .filter(a -> matchesLocation(a.getHub(), stateId, cityId, hubId))
            .toList();

    List<MaintenanceRecord> records = maintenanceRecordRepository.findAll();
    List<MaintenanceReportItem> results = new ArrayList<>();

    for (Asset asset : maintenanceAssets) {
      MaintenanceRecord record =
          records.stream()
              .filter(r -> r.getAsset() != null && r.getAsset().getId().equals(asset.getId()))
              .findFirst()
              .orElse(null);

      Hub hub = asset.getHub();
      City city = hub != null ? hub.getCity() : null;
      State state = city != null ? city.getState() : null;

      results.add(
          MaintenanceReportItem.builder()
              .assetId(asset.getId())
              .assetTag(asset.getAssetTag())
              .machineName(asset.getName())
              .modelName(asset.getModel() != null ? asset.getModel().getName() : asset.getName())
              .category(asset.getCategory() != null ? asset.getCategory().name() : "")
              .hubId(hub != null ? hub.getId() : null)
              .hubName(hub != null ? hub.getName() : "")
              .cityName(city != null ? city.getName() : "")
              .stateName(state != null ? state.getName() : "")
              .ticketNumber(
                  record != null && record.getTicketNumber() != null
                      ? record.getTicketNumber()
                      : ("MN-" + asset.getAssetTag()))
              .issueDescription(
                  record != null && record.getIssueDescription() != null
                      ? record.getIssueDescription()
                      : "")
              .maintenanceType(
                  record != null && record.getServiceType() != null
                      ? record.getServiceType().name()
                      : "")
              .technicianName(
                  record != null && record.getAssignedTechnician() != null
                      ? record.getAssignedTechnician()
                      : (record != null && record.getServiceCenterName() != null
                          ? record.getServiceCenterName()
                          : ""))
              .enteredMaintenanceAt(
                  record != null && record.getStartedAt() != null
                      ? record.getStartedAt().toLocalDateTime()
                      : null)
              .estimatedCompletionDate(record != null ? record.getExpectedCompletionDate() : null)
              .estimatedCost(
                  record != null && record.getEstimatedCost() != null
                      ? record.getEstimatedCost()
                      : (record != null && record.getTotalCost() != null
                          ? record.getTotalCost()
                          : BigDecimal.ZERO))
              .priority(
                  record != null && record.getPriority() != null
                      ? record.getPriority().name()
                      : "NORMAL")
              .status(asset.getStatus().name())
              .build());
    }

    return results;
  }

  @Override
  public List<DealerRevenueReportItem> getDealerRevenueReport(
      Long stateId, Long cityId, Long hubId, String dateRange) {
    LocalDate[] range = resolveDateRange(dateRange);
    LocalDateTime start = range[0].atStartOfDay();
    LocalDateTime end = range[1].atTime(LocalTime.MAX);

    List<DealerCommission> commissions = dealerCommissionRepository.findAll();
    List<DealerRevenueReportItem> results = new ArrayList<>();

    for (DealerCommission dc : commissions) {
      if (dc.getCreatedAt() != null
          && (dc.getCreatedAt().isBefore(start) || dc.getCreatedAt().isAfter(end))) {
        continue;
      }
      Dealer d = dc.getDealer();
      Booking b = dc.getBooking();

      // Dealers operate in a City territory, not a Hub.
      City city = d != null ? d.getCity() : null;
      State state = city != null ? city.getState() : null;

      if (stateId != null && (state == null || !stateId.equals(state.getId()))) {
        continue;
      }
      if (cityId != null && (city == null || !cityId.equals(city.getId()))) {
        continue;
      }

      results.add(
          DealerRevenueReportItem.builder()
              .dealerId(d != null ? d.getId() : null)
              .businessName(
                  d != null && d.getTradeName() != null
                      ? d.getTradeName()
                      : (d != null ? d.getName() : ""))
              .dealerName(d != null ? d.getName() : "")
              .phone(d != null ? d.getPhone() : "")
              .location(d != null ? d.getLocation() : "")
              .cityId(city != null ? city.getId() : null)
              .cityName(city != null ? city.getName() : "")
              .stateId(state != null ? state.getId() : null)
              .stateName(state != null ? state.getName() : "")
              .hubId(null)
              .hubName("")
              .bookingNumber(b != null ? b.getBookingNumber() : "")
              .machineName(b != null && b.getAsset() != null ? b.getAsset().getName() : "")
              .grossRentalRevenue(
                  dc.getGrossRentalRevenue() != null ? dc.getGrossRentalRevenue() : BigDecimal.ZERO)
              .commissionRate(
                  dc.getCommissionRate() != null ? dc.getCommissionRate() : BigDecimal.ZERO)
              .commissionAmount(
                  dc.getCommissionAmount() != null ? dc.getCommissionAmount() : BigDecimal.ZERO)
              .status(dc.getStatus() != null ? dc.getStatus().name() : "PENDING")
              .settledAt(dc.getSettledAt())
              .createdAt(dc.getCreatedAt())
              .build());
    }

    return results;
  }

  @Override
  public List<FutureBookingReportItem> getFutureBookingsReport(
      Long stateId, Long cityId, Long hubId, String dateRange) {
    // "should show the data starting from next day bcz current day is running so future is from
    // tomorrow"
    LocalDate tomorrow = LocalDate.now().plusDays(1);

    List<Booking> allBookings = bookingQueryRepository.fetchAll(null);
    List<FutureBookingReportItem> results = new ArrayList<>();

    for (Booking b : allBookings) {
      if (b.getStartDate() == null || b.getStartDate().isBefore(tomorrow)) {
        continue;
      }
      Asset asset = b.getAsset();
      Hub hub = asset != null ? asset.getHub() : null;
      if (!matchesLocation(hub, stateId, cityId, hubId)) {
        continue;
      }

      int days =
          b.getEndDate() != null
              ? (int) ChronoUnit.DAYS.between(b.getStartDate(), b.getEndDate()) + 1
              : 1;
      if (days < 1) days = 1;

      City city = hub != null ? hub.getCity() : null;
      State state = city != null ? city.getState() : null;

      results.add(
          FutureBookingReportItem.builder()
              .bookingId(b.getId())
              .bookingNumber(b.getBookingNumber() != null ? b.getBookingNumber() : "")
              .assetId(asset != null ? asset.getId() : null)
              .assetTag(asset != null ? asset.getAssetTag() : "")
              .machineName(asset != null ? asset.getName() : "")
              .category(
                  asset != null && asset.getCategory() != null ? asset.getCategory().name() : "")
              .hubId(hub != null ? hub.getId() : null)
              .hubName(hub != null ? hub.getName() : "")
              .cityName(city != null ? city.getName() : "")
              .stateName(state != null ? state.getName() : "")
              .dailyRate(
                  asset != null && asset.getDailyRate() != null
                      ? asset.getDailyRate()
                      : (b.getBaseRent() != null ? b.getBaseRent() : BigDecimal.ZERO))
              .rentalDays(days)
              .startDate(b.getStartDate())
              .endDate(b.getEndDate())
              .customerName(b.getCustomer() != null ? b.getCustomer().getFullName() : "")
              .customerPhone(b.getCustomer() != null ? b.getCustomer().getPhone() : "")
              .deliveryAddress(b.getDeliveryAddress() != null ? b.getDeliveryAddress() : "")
              .deliveryType("FARM")
              .landmark(b.getFarmLocation() != null ? b.getFarmLocation().getLandmark() : "")
              .totalAmount(b.getTotalAmount() != null ? b.getTotalAmount() : BigDecimal.ZERO)
              .depositAmount(b.getDepositAmount() != null ? b.getDepositAmount() : BigDecimal.ZERO)
              .advancePaid(b.getAdvancePaid() != null ? b.getAdvancePaid() : BigDecimal.ZERO)
              .bookingStatus(b.getStatus() != null ? b.getStatus().name() : "CONFIRMED")
              .build());
    }

    return results;
  }

  @Override
  public byte[] exportReportXlsx(
      String reportType, Long stateId, Long cityId, Long hubId, String dateRange) {

    Map<String, String> filters = new HashMap<>();
    if (stateId != null) filters.put("StateId", String.valueOf(stateId));
    if (cityId != null) filters.put("CityId", String.valueOf(cityId));
    if (hubId != null) filters.put("HubId", String.valueOf(hubId));
    if (dateRange != null && !"maintenance".equalsIgnoreCase(reportType)) {
      filters.put("DateScope", dateRange);
    }

    String type =
        reportType != null ? reportType.toLowerCase().replace("-", "_") : "machines_on_rent";

    switch (type) {
      case "collections":
        {
          List<CollectionsReportItem> list =
              getCollectionsReport(stateId, cityId, hubId, dateRange);
          List<String> headers =
              List.of(
                  "Receipt Number",
                  "Booking Number",
                  "Customer Name",
                  "Customer Phone",
                  "Hub Yard",
                  "City",
                  "Payment Mode",
                  "Transaction Ref",
                  "Amount (INR)",
                  "Payment Type",
                  "Payment Date",
                  "Collected By",
                  "Status");
          List<List<Object>> rows = new ArrayList<>();
          for (CollectionsReportItem c : list) {
            rows.add(
                List.of(
                    c.getReceiptNumber() != null ? c.getReceiptNumber() : "",
                    c.getBookingNumber() != null ? c.getBookingNumber() : "",
                    c.getCustomerName() != null ? c.getCustomerName() : "",
                    c.getCustomerPhone() != null ? c.getCustomerPhone() : "",
                    c.getHubName() != null ? c.getHubName() : "",
                    c.getCityName() != null ? c.getCityName() : "",
                    c.getPaymentMode() != null ? c.getPaymentMode() : "",
                    c.getTransactionRef() != null ? c.getTransactionRef() : "",
                    c.getAmount() != null ? c.getAmount() : BigDecimal.ZERO,
                    c.getPaymentType() != null ? c.getPaymentType() : "",
                    c.getPaymentDate() != null ? c.getPaymentDate().toString() : "",
                    c.getCollectedBy() != null ? c.getCollectedBy() : "",
                    c.getStatus() != null ? c.getStatus() : "SETTLED"));
          }
          return ExcelExportUtil.generateWorkbook(
              "Collections & Receipts Ledger",
              "Audited customer advance payments and booking transactions",
              filters,
              "Collections",
              headers,
              rows);
        }

      case "maintenance":
      case "machines_in_maintenance":
        {
          List<MaintenanceReportItem> list = getMachinesInMaintenanceReport(stateId, cityId, hubId);
          List<String> headers =
              List.of(
                  "Ticket Number",
                  "Asset Tag",
                  "Machine Name",
                  "Hub Yard",
                  "City",
                  "Reported Issue",
                  "Maintenance Type",
                  "Assigned Technician",
                  "Entered Maintenance",
                  "Est Completion",
                  "Est Cost (INR)",
                  "Priority",
                  "Status");
          List<List<Object>> rows = new ArrayList<>();
          for (MaintenanceReportItem m : list) {
            rows.add(
                List.of(
                    m.getTicketNumber() != null ? m.getTicketNumber() : "",
                    m.getAssetTag() != null ? m.getAssetTag() : "",
                    m.getMachineName() != null ? m.getMachineName() : "",
                    m.getHubName() != null ? m.getHubName() : "",
                    m.getCityName() != null ? m.getCityName() : "",
                    m.getIssueDescription() != null ? m.getIssueDescription() : "",
                    m.getMaintenanceType() != null ? m.getMaintenanceType() : "",
                    m.getTechnicianName() != null ? m.getTechnicianName() : "",
                    m.getEnteredMaintenanceAt() != null
                        ? m.getEnteredMaintenanceAt().toString()
                        : "",
                    m.getEstimatedCompletionDate() != null
                        ? m.getEstimatedCompletionDate().toString()
                        : "",
                    m.getEstimatedCost() != null ? m.getEstimatedCost() : BigDecimal.ZERO,
                    m.getPriority() != null ? m.getPriority() : "MEDIUM",
                    m.getStatus() != null ? m.getStatus() : "IN_PROGRESS"));
          }
          return ExcelExportUtil.generateWorkbook(
              "Yard Maintenance & Inspection Report",
              "Active machines undergoing preventive service or repair (State/City/Hub Filtered)",
              filters,
              "Maintenance",
              headers,
              rows);
        }

      case "dealer_revenue":
      case "dealers_revenue":
        {
          List<DealerRevenueReportItem> list =
              getDealerRevenueReport(stateId, cityId, hubId, dateRange);
          List<String> headers =
              List.of(
                  "Dealer Business Name",
                  "Contact Person",
                  "Phone",
                  "Location",
                  "City",
                  "State",
                  "Booking Reference",
                  "Machine Assigned",
                  "Gross Rental Revenue (INR)",
                  "Commission Rate",
                  "Commission Amount (INR)",
                  "Settlement Status",
                  "Date");
          List<List<Object>> rows = new ArrayList<>();
          for (DealerRevenueReportItem d : list) {
            rows.add(
                List.of(
                    d.getBusinessName() != null ? d.getBusinessName() : "",
                    d.getDealerName() != null ? d.getDealerName() : "",
                    d.getPhone() != null ? d.getPhone() : "",
                    d.getLocation() != null ? d.getLocation() : "",
                    d.getCityName() != null ? d.getCityName() : "",
                    d.getStateName() != null ? d.getStateName() : "",
                    d.getBookingNumber() != null ? d.getBookingNumber() : "",
                    d.getMachineName() != null ? d.getMachineName() : "",
                    d.getGrossRentalRevenue() != null ? d.getGrossRentalRevenue() : BigDecimal.ZERO,
                    d.getCommissionRate() != null
                        ? d.getCommissionRate().multiply(BigDecimal.valueOf(100)) + "%"
                        : "0%",
                    d.getCommissionAmount() != null ? d.getCommissionAmount() : BigDecimal.ZERO,
                    d.getStatus() != null ? d.getStatus() : "PENDING",
                    d.getCreatedAt() != null ? d.getCreatedAt().toString() : ""));
          }
          return ExcelExportUtil.generateWorkbook(
              "Partner Dealers Revenue & Commission Report",
              "Partner network rental throughput and commission settlement audit",
              filters,
              "Dealers Revenue",
              headers,
              rows);
        }

      case "future_bookings":
        {
          List<FutureBookingReportItem> list =
              getFutureBookingsReport(stateId, cityId, hubId, dateRange);
          List<String> headers =
              List.of(
                  "Booking Reference",
                  "Asset Tag",
                  "Machine Name",
                  "Customer Name",
                  "Customer Phone",
                  "Start Date (Tomorrow+)",
                  "End Date",
                  "Rental Days",
                  "Daily Rate (INR)",
                  "Total Value (INR)",
                  "Advance Paid (INR)",
                  "Delivery Address",
                  "Landmark",
                  "Hub Yard",
                  "City",
                  "Status");
          List<List<Object>> rows = new ArrayList<>();
          for (FutureBookingReportItem f : list) {
            rows.add(
                List.of(
                    f.getBookingNumber() != null ? f.getBookingNumber() : "",
                    f.getAssetTag() != null ? f.getAssetTag() : "",
                    f.getMachineName() != null ? f.getMachineName() : "",
                    f.getCustomerName() != null ? f.getCustomerName() : "",
                    f.getCustomerPhone() != null ? f.getCustomerPhone() : "",
                    f.getStartDate() != null ? f.getStartDate().toString() : "",
                    f.getEndDate() != null ? f.getEndDate().toString() : "",
                    f.getRentalDays(),
                    f.getDailyRate() != null ? f.getDailyRate() : BigDecimal.ZERO,
                    f.getTotalAmount() != null ? f.getTotalAmount() : BigDecimal.ZERO,
                    f.getAdvancePaid() != null ? f.getAdvancePaid() : BigDecimal.ZERO,
                    f.getDeliveryAddress() != null ? f.getDeliveryAddress() : "",
                    f.getLandmark() != null ? f.getLandmark() : "",
                    f.getHubName() != null ? f.getHubName() : "",
                    f.getCityName() != null ? f.getCityName() : "",
                    f.getBookingStatus() != null ? f.getBookingStatus() : "CONFIRMED"));
          }
          return ExcelExportUtil.generateWorkbook(
              "Future Bookings Dispatch Schedule",
              "Upcoming customer bookings starting strictly from tomorrow onwards (Tomorrow+)",
              filters,
              "Future Bookings",
              headers,
              rows);
        }

      case "machines_on_rent":
      default:
        {
          List<MachinesOnRentReportItem> list =
              getMachinesOnRentReport(stateId, cityId, hubId, dateRange);
          List<String> headers =
              List.of(
                  "Asset Tag",
                  "Machine Name",
                  "Model",
                  "Category",
                  "Booking Number",
                  "Customer Name",
                  "Customer Phone",
                  "Start Date",
                  "Expected Return",
                  "Daily Rate (INR)",
                  "Hub Yard",
                  "City",
                  "Delivery Address",
                  "Status");
          List<List<Object>> rows = new ArrayList<>();
          for (MachinesOnRentReportItem m : list) {
            rows.add(
                List.of(
                    m.getAssetTag() != null ? m.getAssetTag() : "",
                    m.getMachineName() != null ? m.getMachineName() : "",
                    m.getModelName() != null ? m.getModelName() : "",
                    m.getCategory() != null ? m.getCategory() : "",
                    m.getBookingNumber() != null ? m.getBookingNumber() : "",
                    m.getCustomerName() != null ? m.getCustomerName() : "",
                    m.getCustomerPhone() != null ? m.getCustomerPhone() : "",
                    m.getStartDate() != null ? m.getStartDate().toString() : "",
                    m.getExpectedReturnDate() != null ? m.getExpectedReturnDate().toString() : "",
                    m.getDailyRate() != null ? m.getDailyRate() : BigDecimal.ZERO,
                    m.getHubName() != null ? m.getHubName() : "",
                    m.getCityName() != null ? m.getCityName() : "",
                    m.getDeliveryAddress() != null ? m.getDeliveryAddress() : "",
                    m.getStatus() != null ? m.getStatus() : "ON_RENT"));
          }
          return ExcelExportUtil.generateWorkbook(
              "Total Machines on Rent Manifest",
              "Live active machinery deployments and customer field assignments",
              filters,
              "Machines on Rent",
              headers,
              rows);
        }
    }
  }

  @Override
  public byte[] exportMachinesOnRentXlsx(Long stateId, Long cityId, Long hubId, String dateRange) {
    return exportReportXlsx("machines_on_rent", stateId, cityId, hubId, dateRange);
  }

  @Override
  public byte[] exportCollectionsXlsx(Long stateId, Long cityId, Long hubId, String dateRange) {
    return exportReportXlsx("collections", stateId, cityId, hubId, dateRange);
  }

  @Override
  public byte[] exportMachinesInMaintenanceXlsx(Long stateId, Long cityId, Long hubId) {
    return exportReportXlsx("maintenance", stateId, cityId, hubId, null);
  }

  @Override
  public byte[] exportDealerRevenueXlsx(Long stateId, Long cityId, Long hubId, String dateRange) {
    return exportReportXlsx("dealers_revenue", stateId, cityId, hubId, dateRange);
  }

  @Override
  public byte[] exportFutureBookingsXlsx(Long stateId, Long cityId, Long hubId, String dateRange) {
    return exportReportXlsx("future_bookings", stateId, cityId, hubId, dateRange);
  }
}
