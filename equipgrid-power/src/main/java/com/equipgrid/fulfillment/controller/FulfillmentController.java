package com.equipgrid.fulfillment.controller;

import com.equipgrid.booking.service.IBookingService;
import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.core.ratelimiter.RateLimited;
import com.equipgrid.fulfillment.dto.request.UpdateJobRequest;
import com.equipgrid.fulfillment.entity.DeliveryJob;
import com.equipgrid.fulfillment.entity.ReturnPickupJob;
import com.equipgrid.fulfillment.enums.JobStatus;
import com.equipgrid.fulfillment.repository.DeliveryJobRepository;
import com.equipgrid.fulfillment.repository.ReturnPickupJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;

@RestController @RequiredArgsConstructor @RequestMapping("/fulfillment")
public class FulfillmentController {
 private final DeliveryJobRepository deliveryJobs; private final ReturnPickupJobRepository returnJobs; private final IBookingService bookingService;
 @GetMapping("/deliveries") public ResponseEntity<ApiResponse<List<DeliveryJob>>> deliveries() { return ResponseEntity.ok(ApiResponse.buildSuccess(deliveryJobs.findAll())); }
 @GetMapping("/returns") public ResponseEntity<ApiResponse<List<ReturnPickupJob>>> returns() { return ResponseEntity.ok(ApiResponse.buildSuccess(returnJobs.findAll())); }
 @PostMapping("/bookings/{bookingId}/delivery")
 @RateLimited(limit = 10, name = "fulfillment_delivery")
 public ResponseEntity<ApiResponse<DeliveryJob>> createDelivery(@PathVariable Long bookingId, @RequestBody UpdateJobRequest r) {
  DeliveryJob job = deliveryJobs.findByBookingId(bookingId).orElseGet(() -> DeliveryJob.builder().booking(bookingService.getBookingById(bookingId)).build());
  apply(job, r); if (job.getStatus() == null) job.setStatus(JobStatus.SCHEDULED); return ResponseEntity.ok(ApiResponse.buildSuccess("Delivery job saved", deliveryJobs.save(job)));
 }
 @PatchMapping("/deliveries/{id}") public ResponseEntity<ApiResponse<DeliveryJob>> updateDelivery(@PathVariable Long id, @RequestBody UpdateJobRequest r) {
  DeliveryJob job = deliveryJobs.findById(id).orElseThrow(); apply(job, r); if (job.getStatus() == JobStatus.COMPLETED) job.setDeliveredAt(LocalDateTime.now()); return ResponseEntity.ok(ApiResponse.buildSuccess("Delivery job updated", deliveryJobs.save(job)));
 }
 @PatchMapping("/returns/{id}") public ResponseEntity<ApiResponse<ReturnPickupJob>> updateReturn(@PathVariable Long id, @RequestBody UpdateJobRequest r) {
  ReturnPickupJob job = returnJobs.findById(id).orElseThrow(); if (r.getStatus()!=null) job.setStatus(r.getStatus()); job.setDriverName(r.getDriverName()); job.setDriverPhone(r.getDriverPhone()); job.setVehicleNumber(r.getVehicleNumber()); job.setScheduledFor(r.getScheduledFor()); job.setPickupNotes(r.getNotes()); if (job.getStatus()==JobStatus.COMPLETED) job.setCollectedAt(LocalDateTime.now()); return ResponseEntity.ok(ApiResponse.buildSuccess("Return pickup updated", returnJobs.save(job)));
 }
 private void apply(DeliveryJob j, UpdateJobRequest r) { if(r.getStatus()!=null)j.setStatus(r.getStatus()); j.setDriverName(r.getDriverName());j.setDriverPhone(r.getDriverPhone());j.setVehicleNumber(r.getVehicleNumber());j.setScheduledFor(r.getScheduledFor());j.setEtaStart(r.getEtaStart());j.setEtaEnd(r.getEtaEnd());j.setReceiverName(r.getReceiverName());j.setReceiverPhone(r.getReceiverPhone());j.setDeliveryNotes(r.getNotes()); }
}
