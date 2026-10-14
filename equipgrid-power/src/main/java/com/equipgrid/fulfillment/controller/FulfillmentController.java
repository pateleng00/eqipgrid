package com.equipgrid.fulfillment.controller;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.core.ratelimiter.RateLimited;
import com.equipgrid.fulfillment.dto.request.UpdateJobRequest;
import com.equipgrid.fulfillment.entity.DeliveryJob;
import com.equipgrid.fulfillment.entity.ReturnPickupJob;
import com.equipgrid.fulfillment.service.IFulfillmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/fulfillment")
@Tag(name = "Fulfillment & Logistics", description = "Delivery dispatch and return collection job tracking")
public class FulfillmentController {

    private final IFulfillmentService fulfillmentService;

    @GetMapping("/deliveries")
    @Operation(summary = "List all delivery fulfillment jobs")
    public ResponseEntity<ApiResponse<List<DeliveryJob>>> deliveries() {
        return ResponseEntity.ok(ApiResponse.buildSuccess(fulfillmentService.getAllDeliveries()));
    }

    @GetMapping("/returns")
    @Operation(summary = "List all return pickup fulfillment jobs")
    public ResponseEntity<ApiResponse<List<ReturnPickupJob>>> returns() {
        return ResponseEntity.ok(ApiResponse.buildSuccess(fulfillmentService.getAllReturns()));
    }

    @PostMapping("/bookings/{bookingId}/delivery")
    @RateLimited(limit = 10, name = "fulfillment_delivery")
    @Operation(summary = "Create or update delivery job for a booking")
    public ResponseEntity<ApiResponse<DeliveryJob>> createDelivery(
            @PathVariable Long bookingId,
            @RequestBody UpdateJobRequest request) {
        DeliveryJob job = fulfillmentService.createOrUpdateDeliveryForBooking(bookingId, request);
        return ResponseEntity.ok(ApiResponse.buildSuccess("Delivery job saved", job));
    }

    @PatchMapping("/deliveries/{id}")
    @Operation(summary = "Update delivery fulfillment job details and status")
    public ResponseEntity<ApiResponse<DeliveryJob>> updateDelivery(
            @PathVariable Long id,
            @RequestBody UpdateJobRequest request) {
        DeliveryJob job = fulfillmentService.updateDeliveryJob(id, request);
        return ResponseEntity.ok(ApiResponse.buildSuccess("Delivery job updated", job));
    }

    @PatchMapping("/returns/{id}")
    @Operation(summary = "Update return pickup job details and status")
    public ResponseEntity<ApiResponse<ReturnPickupJob>> updateReturn(
            @PathVariable Long id,
            @RequestBody UpdateJobRequest request) {
        ReturnPickupJob job = fulfillmentService.updateReturnJob(id, request);
        return ResponseEntity.ok(ApiResponse.buildSuccess("Return pickup updated", job));
    }
}
