package com.equipgrid.booking.controller;

import com.equipgrid.booking.dto.request.CreateBookingRequest;
import com.equipgrid.booking.dto.request.QuoteRequest;
import com.equipgrid.booking.dto.request.UpdateBookingStatusRequest;
import com.equipgrid.booking.dto.response.QuoteResponse;
import com.equipgrid.booking.entity.Booking;
import com.equipgrid.booking.enums.BookingStatus;
import com.equipgrid.booking.service.IBookingService;
import com.equipgrid.common.dto.rest.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/bookings")
@Tag(name = "Booking & Quotation", description = "SOP-002 Booking desk, instant quotation and reservation lifecycle")
public class BookingController {

    private final IBookingService bookingService;

    public BookingController(IBookingService bookingService) {
        this.bookingService = bookingService;
    }

    @GetMapping
    @Operation(summary = "List all bookings with optional status filter")
    public ResponseEntity<ApiResponse<List<Booking>>> getAllBookings(@RequestParam(required = false) BookingStatus status) {
        return ResponseEntity.ok(ApiResponse.buildSuccess(bookingService.getAllBookings(status)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get booking by ID")
    public ResponseEntity<ApiResponse<Booking>> getBookingById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.buildSuccess(bookingService.getBookingById(id)));
    }

    @GetMapping("/number/{bookingNumber}")
    @Operation(summary = "Get booking by reference number (e.g. BK-2026-0101)")
    public ResponseEntity<ApiResponse<Booking>> getBookingByNumber(@PathVariable String bookingNumber) {
        return ResponseEntity.ok(ApiResponse.buildSuccess(bookingService.getBookingByNumber(bookingNumber)));
    }

    @PostMapping("/quote")
    @Operation(summary = "Instant commercial quotation calculator (Base rent, delivery zones, operator fee, deposit)")
    public ResponseEntity<ApiResponse<QuoteResponse>> calculateQuote(@Valid @RequestBody QuoteRequest request) {
        return ResponseEntity.ok(ApiResponse.buildSuccess(bookingService.calculateQuote(request)));
    }

    @PostMapping
    @Operation(summary = "Create and record a new booking reservation")
    public ResponseEntity<ApiResponse<Booking>> createBooking(
            @Valid @RequestBody CreateBookingRequest request,
            Principal principal) {
        String actor = principal != null ? principal.getName() : "RENTAL_DESK";
        Booking saved = bookingService.createBooking(request, actor);
        return ResponseEntity.ok(ApiResponse.buildSuccess("Booking reserved successfully", saved));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update booking status")
    public ResponseEntity<ApiResponse<Booking>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateBookingStatusRequest request,
            Principal principal) {
        String actor = principal != null ? principal.getName() : "STAFF";
        Booking updated = bookingService.updateStatus(id, request.getStatus(), request.getNotes(), actor);
        return ResponseEntity.ok(ApiResponse.buildSuccess("Booking status updated", updated));
    }
}
