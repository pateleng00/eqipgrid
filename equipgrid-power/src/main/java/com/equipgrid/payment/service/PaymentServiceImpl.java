package com.equipgrid.payment.service;

import com.equipgrid.audit.service.IAuditService;
import com.equipgrid.booking.entity.Booking;
import com.equipgrid.booking.enums.BookingStatus;
import com.equipgrid.booking.repository.BookingQueryRepository;
import com.equipgrid.booking.repository.BookingRepository;
import com.equipgrid.common.Exceptions;
import com.equipgrid.payment.dto.request.RecordPaymentRequest;
import com.equipgrid.payment.entity.Payment;
import com.equipgrid.payment.enums.PaymentType;
import com.equipgrid.payment.repository.PaymentQueryRepository;
import com.equipgrid.payment.repository.PaymentRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Service
@AllArgsConstructor
public class PaymentServiceImpl implements IPaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentQueryRepository paymentQueryRepository;
    private final BookingRepository bookingRepository;
    private final BookingQueryRepository bookingQueryRepository;
    private final IAuditService auditService;

    @Override
    public List<Payment> getPaymentsByBooking(Long bookingId) {
        return paymentQueryRepository.fetchByBookingId(bookingId);
    }

    @Override
    public List<Payment> getAllPayments() {
        return paymentQueryRepository.fetchAll();
    }

    @Override
    @Transactional
    public Payment recordPayment(RecordPaymentRequest request, String performedBy) {
        Booking booking = bookingQueryRepository.fetchById(request.getBookingId())
                .orElseThrow(() -> new Exceptions.ResourceNotFoundException("Booking not found: " + request.getBookingId()));

        Payment payment = Payment.builder()
                .booking(booking)
                .customer(booking.getCustomer())
                .amount(request.getAmount())
                .paymentType(request.getPaymentType())
                .paymentMode(request.getPaymentMode())
                .transactionRef(request.getTransactionRef())
                .notes(request.getNotes())
                .build();

        Payment saved = paymentRepository.save(payment);

        if (request.getPaymentType() == PaymentType.ADVANCE) {
            BigDecimal currentAdv = booking.getAdvancePaid() != null ? booking.getAdvancePaid() : BigDecimal.ZERO;
            booking.setAdvancePaid(currentAdv.add(request.getAmount()));
        } else if (request.getPaymentType() == PaymentType.DEPOSIT) {
            BigDecimal currentDep = booking.getDepositPaid() != null ? booking.getDepositPaid() : BigDecimal.ZERO;
            booking.setDepositPaid(currentDep.add(request.getAmount()));
        }

        BigDecimal advance = booking.getAdvancePaid() != null ? booking.getAdvancePaid() : BigDecimal.ZERO;
        BigDecimal deposit = booking.getDepositPaid() != null ? booking.getDepositPaid() : BigDecimal.ZERO;
        BigDecimal requiredBarrier = booking.getDepositAmount().add(booking.getBaseRent());

        if (advance.add(deposit).compareTo(requiredBarrier) >= 0 && booking.getStatus() == BookingStatus.CONFIRMED) {
            booking.setStatus(BookingStatus.DISPATCH_READY);
        }

        bookingRepository.save(booking);

        auditService.log("PAYMENT", saved.getId().toString(), "RECORD_PAYMENT",
                performedBy != null ? performedBy : "CASHIER",
                "Recorded " + request.getPaymentType() + " of INR " + request.getAmount() + " via " + request.getPaymentMode() + " for booking " + booking.getBookingNumber());

        return saved;
    }
}
