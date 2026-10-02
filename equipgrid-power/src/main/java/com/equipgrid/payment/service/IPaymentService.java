package com.equipgrid.payment.service;

import com.equipgrid.payment.dto.request.RecordPaymentRequest;
import com.equipgrid.payment.entity.Payment;

import java.util.List;

public interface IPaymentService {
    List<Payment> getPaymentsByBooking(Long bookingId);
    List<Payment> getAllPayments();
    Payment recordPayment(RecordPaymentRequest request, String performedBy);
}
