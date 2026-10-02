package com.equipgrid.booking.service;

import com.equipgrid.booking.dto.request.CreateBookingRequest;
import com.equipgrid.booking.dto.request.QuoteRequest;
import com.equipgrid.booking.dto.response.QuoteResponse;
import com.equipgrid.booking.entity.Booking;
import com.equipgrid.booking.enums.BookingStatus;

import java.util.List;

public interface IBookingService {
    List<Booking> getAllBookings(BookingStatus status);

    Booking getBookingById(Long id);

    Booking getBookingByNumber(String bookingNumber);

    QuoteResponse calculateQuote(QuoteRequest request);

    Booking createBooking(CreateBookingRequest request, String performedBy);

    Booking updateStatus(Long id, BookingStatus newStatus, String notes, String performedBy);
}
