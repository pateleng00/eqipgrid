package com.equipgrid.returninspection.service;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.enums.AssetStatus;
import com.equipgrid.asset.repository.AssetRepository;
import com.equipgrid.audit.service.IAuditService;
import com.equipgrid.booking.entity.Booking;
import com.equipgrid.booking.enums.BookingStatus;
import com.equipgrid.booking.repository.BookingQueryRepository;
import com.equipgrid.booking.repository.BookingRepository;
import com.equipgrid.common.Exceptions;
import com.equipgrid.returninspection.dto.request.CreateInspectionRequest;
import com.equipgrid.returninspection.dto.response.SettlementCalculationResponse;
import com.equipgrid.returninspection.entity.ReturnInspection;
import com.equipgrid.returninspection.repository.ReturnInspectionQueryRepository;
import com.equipgrid.returninspection.repository.ReturnInspectionRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Service
@AllArgsConstructor
public class ReturnInspectionServiceImpl implements IReturnInspectionService {

    private final ReturnInspectionRepository inspectionRepository;
    private final ReturnInspectionQueryRepository returnInspectionQueryRepository;
    private final BookingRepository bookingRepository;
    private final BookingQueryRepository bookingQueryRepository;
    private final AssetRepository assetRepository;
    private final IAuditService auditService;
    private final com.equipgrid.whatsapp.service.IWhatsAppNotificationService whatsAppNotificationService;

    @Override
    public List<ReturnInspection> getInspectionsByBooking(Long bookingId) {
        return returnInspectionQueryRepository.fetchByBookingId(bookingId);
    }

    @Override
    @Transactional
    public ReturnInspection executeInspection(CreateInspectionRequest request, String performedBy) {
        Booking booking = bookingQueryRepository.fetchById(request.getBookingId())
                .orElseThrow(() -> new Exceptions.ResourceNotFoundException("Booking not found: " + request.getBookingId()));

        Asset asset = booking.getAsset();

        AssetStatus finalStatus = request.getNextAction() != null ? request.getNextAction() : AssetStatus.AVAILABLE;
        if (Boolean.TRUE.equals(request.getHasDamage())) {
            finalStatus = AssetStatus.MAINTENANCE;
        }

        ReturnInspection inspection = ReturnInspection.builder()
                .booking(booking)
                .asset(asset)
                .fuelLevelReturn(request.getFuelLevelReturn())
                .fuelDeltaCharge(request.getFuelDeltaCharge() != null ? request.getFuelDeltaCharge() : BigDecimal.ZERO)
                .engineHoursIn(request.getEngineHoursIn() != null ? request.getEngineHoursIn() : asset.getEngineHours())
                .accessoriesReturnedOk(request.getAccessoriesReturnedOk())
                .hasDamage(request.getHasDamage())
                .damageCost(request.getDamageCost() != null ? request.getDamageCost() : BigDecimal.ZERO)
                .damageDescription(request.getDamageDescription())
                .inspectorName(request.getInspectorName())
                .nextAction(finalStatus)
                .build();

        ReturnInspection saved = inspectionRepository.save(inspection);

        asset.setStatus(finalStatus);
        if (request.getEngineHoursIn() != null && request.getEngineHoursIn().compareTo(BigDecimal.ZERO) > 0) {
            asset.setEngineHours(request.getEngineHoursIn());
        }
        assetRepository.save(asset);

        booking.setStatus(BookingStatus.CLOSED);
        bookingRepository.save(booking);

        // Notify customer on return inspection completion & refund settlement via WhatsApp
        try {
            whatsAppNotificationService.notifyReturnSettlement(booking.getId());
        } catch (Exception e) {
            log.warn("[ReturnInspection] WhatsApp return settlement notification failed for booking {}: {}",
                    booking.getBookingNumber(), e.getMessage());
        }

        auditService.log("RETURN", saved.getId().toString(), "RETURN_INSPECTION",
                performedBy != null ? performedBy : "INSPECTOR",
                "Inspection complete for " + asset.getAssetTag() + ". Machine transitioned to: " + finalStatus);

        return saved;
    }

    @Override
    public SettlementCalculationResponse calculateDepositSettlement(Long bookingId) {
        Booking booking = bookingQueryRepository.fetchById(bookingId)
                .orElseThrow(() -> new Exceptions.ResourceNotFoundException("Booking not found: " + bookingId));

        List<ReturnInspection> list = returnInspectionQueryRepository.fetchByBookingId(bookingId);
        BigDecimal damage = BigDecimal.ZERO;
        BigDecimal fuelDelta = BigDecimal.ZERO;

        if (!list.isEmpty()) {
            ReturnInspection last = list.get(list.size() - 1);
            if (last.getDamageCost() != null) damage = last.getDamageCost();
            if (last.getFuelDeltaCharge() != null) fuelDelta = last.getFuelDeltaCharge();
        }

        BigDecimal depositPaid = booking.getDepositPaid() != null ? booking.getDepositPaid() : BigDecimal.ZERO;
        BigDecimal netRefund = depositPaid.subtract(damage).subtract(fuelDelta);
        if (netRefund.compareTo(BigDecimal.ZERO) < 0) {
            netRefund = BigDecimal.ZERO;
        }

        return SettlementCalculationResponse.builder()
                .bookingId(booking.getId())
                .originalDeposit(depositPaid)
                .damageDeduction(damage)
                .fuelDeltaDeduction(fuelDelta)
                .netDepositRefundable(netRefund)
                .recommendation(netRefund.compareTo(depositPaid) == 0 ? "Full Deposit Refundable (No Damage)" : "Deductions applied for repair/fuel")
                .build();
    }
}
