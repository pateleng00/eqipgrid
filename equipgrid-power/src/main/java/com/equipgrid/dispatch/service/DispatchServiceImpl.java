package com.equipgrid.dispatch.service;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.enums.AssetStatus;
import com.equipgrid.asset.repository.AssetRepository;
import com.equipgrid.audit.service.IAuditService;
import com.equipgrid.booking.entity.Booking;
import com.equipgrid.booking.enums.BookingStatus;
import com.equipgrid.booking.repository.BookingQueryRepository;
import com.equipgrid.booking.repository.BookingRepository;
import com.equipgrid.common.Exceptions;
import com.equipgrid.dispatch.dto.request.CreateDispatchRequest;
import com.equipgrid.dispatch.entity.DispatchRecord;
import com.equipgrid.dispatch.repository.DispatchQueryRepository;
import com.equipgrid.dispatch.repository.DispatchRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Service
@AllArgsConstructor
public class DispatchServiceImpl implements IDispatchService {

    private final DispatchRepository dispatchRepository;
    private final DispatchQueryRepository dispatchQueryRepository;
    private final BookingRepository bookingRepository;
    private final BookingQueryRepository bookingQueryRepository;
    private final AssetRepository assetRepository;
    private final IAuditService auditService;

    private static final AtomicLong CHALLAN_SEQ = new AtomicLong(100);

    @Override
    public DispatchRecord getByBookingId(Long bookingId) {
        return dispatchQueryRepository.fetchByBookingId(bookingId)
                .orElseThrow(() -> new Exceptions.ResourceNotFoundException("Dispatch record not found for booking: " + bookingId));
    }

    @Override
    @Transactional
    public DispatchRecord executeDispatch(CreateDispatchRequest request, String performedBy) {
        Booking booking = bookingQueryRepository.fetchById(request.getBookingId())
                .orElseThrow(() -> new Exceptions.ResourceNotFoundException("Booking not found: " + request.getBookingId()));

        BigDecimal advance = booking.getAdvancePaid() != null ? booking.getAdvancePaid() : BigDecimal.ZERO;
        BigDecimal deposit = booking.getDepositPaid() != null ? booking.getDepositPaid() : BigDecimal.ZERO;
        BigDecimal requiredBarrier = booking.getDepositAmount().add(booking.getBaseRent());

        BigDecimal totalCollected = advance.add(deposit);
        if (totalCollected.compareTo(requiredBarrier) < 0) {
            throw new Exceptions.BusinessRuleViolationException(
                    "ZERO-OPEN-CREDIT VIOLATION: Dispatch blocked! Required initial collection is INR " + requiredBarrier +
                    " (Deposit: INR " + booking.getDepositAmount() + " + Advance Rent: INR " + booking.getBaseRent() +
                    "), but only INR " + totalCollected + " was paid.");
        }

        Asset asset = booking.getAsset();

        String challan = "DC-" + LocalDate.now().getYear() + "-" + String.format("%04d", CHALLAN_SEQ.incrementAndGet());

        DispatchRecord record = DispatchRecord.builder()
                .challanNumber(challan)
                .booking(booking)
                .asset(asset)
                .fuelLevel(request.getFuelLevel() != null ? request.getFuelLevel() : "100%")
                .engineHoursOut(request.getEngineHoursOut() != null ? request.getEngineHoursOut() : asset.getEngineHours())
                .accessoriesVerified(request.getAccessoriesVerified() != null ? request.getAccessoriesVerified() : true)
                .conditionNotes(request.getConditionNotes())
                .photoUrls(request.getPhotoUrls())
                .driverName(request.getDriverName())
                .customerSignatureConfirmed(request.getCustomerSignatureConfirmed() != null ? request.getCustomerSignatureConfirmed() : true)
                .dispatchTimestamp(LocalDateTime.now())
                .build();

        DispatchRecord saved = dispatchRepository.save(record);

        asset.setStatus(AssetStatus.ON_RENT);
        assetRepository.save(asset);

        booking.setStatus(BookingStatus.ON_RENT);
        bookingRepository.save(booking);

        auditService.log("DISPATCH", saved.getChallanNumber(), "DISPATCH_RELEASE",
                performedBy != null ? performedBy : "YARD_DISPATCH",
                "Challan issued. Asset " + asset.getAssetTag() + " released to site. Booking: " + booking.getBookingNumber());

        return saved;
    }
}
