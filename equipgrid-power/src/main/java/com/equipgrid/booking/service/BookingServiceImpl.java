package com.equipgrid.booking.service;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.enums.AssetStatus;
import com.equipgrid.asset.service.IAssetService;
import com.equipgrid.audit.service.IAuditService;
import com.equipgrid.booking.dto.request.CreateBookingRequest;
import com.equipgrid.booking.dto.request.QuoteRequest;
import com.equipgrid.booking.dto.response.QuoteResponse;
import com.equipgrid.booking.entity.Booking;
import com.equipgrid.booking.enums.BookingStatus;
import com.equipgrid.booking.repository.BookingQueryRepository;
import com.equipgrid.booking.repository.BookingRepository;
import com.equipgrid.asset.repository.AssetQueryRepository;
import com.equipgrid.asset.repository.AssetRepository;
import com.equipgrid.common.Exceptions;
import com.equipgrid.customer.entity.Customer;
import com.equipgrid.customer.service.ICustomerService;
import com.equipgrid.whatsapp.service.IWhatsAppNotificationService;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Service
@AllArgsConstructor
public class BookingServiceImpl implements IBookingService {

    private static final AtomicLong SEQUENCE = new AtomicLong(100);
    private final BookingRepository bookingRepository;
    private final BookingQueryRepository bookingQueryRepository;
    private final AssetRepository assetRepository;
    private final AssetQueryRepository assetQueryRepository;
    private final IAssetService assetService;
    private final ICustomerService customerService;
    private final PricingEngine pricingEngine;
    private final IAuditService auditService;
    private final IWhatsAppNotificationService whatsAppNotificationService;

    @Override
    public List<Booking> getAllBookings(BookingStatus status) {
        return bookingQueryRepository.fetchAll(status);
    }

    @Override
    public Booking getBookingById(Long id) {
        return bookingQueryRepository.fetchById(id)
                .orElseThrow(() -> new Exceptions.ResourceNotFoundException("Booking not found with ID: " + id));
    }

    @Override
    public Booking getBookingByNumber(String bookingNumber) {
        return bookingQueryRepository.fetchByBookingNumber(bookingNumber)
                .orElseThrow(() -> new Exceptions.ResourceNotFoundException("Booking not found with number: " + bookingNumber));
    }

    @Override
    public QuoteResponse calculateQuote(QuoteRequest request) {
        Asset asset = assetService.getAssetById(request.getAssetId());

        boolean opRequired = Boolean.TRUE.equals(asset.getOperatorRequired()) || Boolean.TRUE.equals(request.getOperatorRequired());

        PricingEngine.CommercialQuote quote = pricingEngine.calculate(
                asset.getDailyRate(),
                asset.getDepositAmount(),
                request.getStartDate(),
                request.getEndDate(),
                request.getDistanceKm(),
                opRequired
        );

        return QuoteResponse.builder()
                .assetId(asset.getId())
                .assetName(asset.getName())
                .assetTag(asset.getAssetTag())
                .durationDays(quote.durationDays)
                .dailyRate(asset.getDailyRate())
                .baseRent(quote.baseRent)
                .deliveryFee(quote.deliveryFee)
                .operatorFee(quote.operatorFee)
                .depositAmount(quote.depositAmount)
                .totalAmount(quote.totalAmount)
                .requiredInitialPayment(quote.requiredInitialAmount)
                .build();
    }

    @Override
    @Transactional
    public Booking createBooking(CreateBookingRequest request, String performedBy) {
        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new Exceptions.BusinessRuleViolationException("End date cannot be earlier than start date");
        }

        Customer customer = customerService.getCustomerById(request.getCustomerId());
        Asset asset = assetService.getAssetById(request.getAssetId());

        Long typeId = asset.getType() != null ? asset.getType().getId() : null;
        Long hubId = asset.getHub() != null ? asset.getHub().getId() : null;
        String assetName = asset.getName();

        // 1. Fetch all operational machines of this type/model in the fleet
        List<Asset> fleetUnits = assetQueryRepository.fetchOperationalMachinesByType(typeId, assetName, hubId);
        if (fleetUnits.isEmpty()) {
            fleetUnits = List.of(asset);
        }

        // 2. Fetch distinct unit IDs of this type already booked/locked during the requested date window
        List<Long> lockedAssetIds = bookingQueryRepository.fetchConflictingAssetIdsForType(
                typeId, assetName, hubId, request.getStartDate(), request.getEndDate()
        );

        long totalCapacity = fleetUnits.size();
        long bookedUnitsCount = lockedAssetIds.size();

        // Strict capacity limit: Cannot accept bookings more than actual count of that type of machines!
        if (totalCapacity > 0 && bookedUnitsCount >= totalCapacity) {
            String typeName = asset.getType() != null ? asset.getType().getName() : asset.getName();
            String yardName = asset.getHub() != null ? asset.getHub().getName() : "Central Yard";
            throw new Exceptions.BusinessRuleViolationException(
                    "FLEET INVENTORY CAPACITY EXCEEDED: All " + totalCapacity + " units of " + typeName +
                    " at " + yardName + " are already booked and locked for dates " +
                    request.getStartDate() + " to " + request.getEndDate() + ". " +
                    "Cannot accept booking beyond actual fleet count of " + totalCapacity + " machines."
            );
        }

        // 3. If requested specific unit is locked or unavailable, auto-allocate an available sister unit of the same type
        if (lockedAssetIds.contains(asset.getId()) || asset.getStatus() == AssetStatus.MAINTENANCE ||
            asset.getStatus() == AssetStatus.RETIRED || asset.getStatus() == AssetStatus.DAMAGED) {

            Asset availableSister = fleetUnits.stream()
                    .filter(u -> !lockedAssetIds.contains(u.getId()))
                    .filter(u -> u.getStatus() != AssetStatus.MAINTENANCE && u.getStatus() != AssetStatus.RETIRED && u.getStatus() != AssetStatus.DAMAGED)
                    .findFirst()
                    .orElse(null);

            if (availableSister == null) {
                String typeName = asset.getType() != null ? asset.getType().getName() : asset.getName();
                throw new Exceptions.BusinessRuleViolationException(
                        "All available units of " + typeName + " are booked or locked for these dates."
                );
            }

            log.info("Requested machine {} was busy; allocating available sister unit {} (type: {})",
                    asset.getAssetTag(), availableSister.getAssetTag(), availableSister.getName());
            asset = availableSister;
        }

        boolean opRequired = Boolean.TRUE.equals(asset.getOperatorRequired()) || Boolean.TRUE.equals(request.getOperatorRequired());

        PricingEngine.CommercialQuote quote = pricingEngine.calculate(
                asset.getDailyRate(),
                asset.getDepositAmount(),
                request.getStartDate(),
                request.getEndDate(),
                request.getDistanceKm(),
                opRequired
        );

        String bNumber = generateUniqueBookingNumber();

        Booking booking = Booking.builder()
                .bookingNumber(bNumber)
                .customer(customer)
                .asset(asset)
                .dealerId(request.getDealerId())
                .status(BookingStatus.CONFIRMED)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .baseRent(quote.baseRent)
                .deliveryFee(quote.deliveryFee)
                .operatorFee(quote.operatorFee)
                .depositAmount(quote.depositAmount)
                .totalAmount(quote.totalAmount)
                .deliveryAddress(request.getDeliveryAddress())
                .distanceKm(request.getDistanceKm())
                .operatorRequired(opRequired)
                .notes(request.getNotes())
                .build();

        Booking saved = bookingRepository.save(booking);
        auditService.log("BOOKING", saved.getBookingNumber(), "CREATE_BOOKING",
                performedBy != null ? performedBy : "RENTAL_DESK",
                "Booking created for " + customer.getFullName() + ", asset " + asset.getAssetTag());

        try {
            whatsAppNotificationService.notifyBookingCreated(saved.getId());
        } catch (Exception e) {
            log.warn("Could not dispatch WhatsApp notification for booking {}: {}", saved.getBookingNumber(), e.getMessage());
        }

        return saved;
    }

    @Override
    @Transactional
    public Booking updateStatus(Long id, BookingStatus newStatus, String notes, String performedBy) {
        Booking booking = getBookingById(id);
        BookingStatus oldStatus = booking.getStatus();

        booking.setStatus(newStatus);
        if (notes != null) {
            booking.setNotes((booking.getNotes() != null ? booking.getNotes() + " | " : "") + notes);
        }

        Booking updated = bookingRepository.save(booking);

        if (newStatus == BookingStatus.CANCELLED) {
            Asset bookedAsset = booking.getAsset();
            if (bookedAsset != null && (bookedAsset.getStatus() == AssetStatus.RESERVED || bookedAsset.getStatus() == AssetStatus.DISPATCH_READY)) {
                bookedAsset.setStatus(AssetStatus.AVAILABLE);
                assetRepository.save(bookedAsset);
                log.info("Asset {} unlocked to AVAILABLE due to cancellation of booking {}",
                        bookedAsset.getAssetTag(), booking.getBookingNumber());
            }
        }

        auditService.log("BOOKING", updated.getBookingNumber(), "STATUS_CHANGE",
                performedBy != null ? performedBy : "STAFF",
                "Status transitioned from " + oldStatus + " to " + newStatus);
        return updated;
    }

    private String generateUniqueBookingNumber() {
        int year = LocalDate.now().getYear();
        for (int i = 0; i < 10; i++) {
            long seq = (System.currentTimeMillis() % 900000L) + 100000L + SEQUENCE.incrementAndGet();
            String candidate = "BK-" + year + "-" + seq;
            if (bookingQueryRepository.fetchByBookingNumber(candidate).isEmpty()) {
                return candidate;
            }
        }
        return "BK-" + year + "-" + System.currentTimeMillis();
    }
}
