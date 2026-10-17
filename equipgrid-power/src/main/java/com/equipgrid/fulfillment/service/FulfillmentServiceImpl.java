package com.equipgrid.fulfillment.service;

import com.equipgrid.booking.service.IBookingService;
import com.equipgrid.fulfillment.dto.request.UpdateJobRequest;
import com.equipgrid.fulfillment.entity.DeliveryJob;
import com.equipgrid.fulfillment.entity.ReturnPickupJob;
import com.equipgrid.fulfillment.enums.JobStatus;
import com.equipgrid.fulfillment.repository.DeliveryJobRepository;
import com.equipgrid.fulfillment.repository.FulfillmentQueryRepository;
import com.equipgrid.fulfillment.repository.ReturnPickupJobRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class FulfillmentServiceImpl implements IFulfillmentService {

  private final DeliveryJobRepository deliveryJobs;
  private final ReturnPickupJobRepository returnJobs;
  private final FulfillmentQueryRepository fulfillmentQueryRepository;
  private final IBookingService bookingService;

  @Override
  @Transactional(readOnly = true)
  public List<DeliveryJob> getAllDeliveries() {
    return fulfillmentQueryRepository.fetchAllDeliveryJobs();
  }

  @Override
  @Transactional(readOnly = true)
  public List<ReturnPickupJob> getAllReturns() {
    return fulfillmentQueryRepository.fetchAllReturnPickupJobs();
  }

  @Override
  public DeliveryJob createOrUpdateDeliveryForBooking(Long bookingId, UpdateJobRequest request) {
    DeliveryJob job =
        fulfillmentQueryRepository
            .fetchDeliveryJobByBookingId(bookingId)
            .orElseGet(
                () ->
                    DeliveryJob.builder()
                        .booking(bookingService.getBookingById(bookingId))
                        .build());
    applyDeliveryDetails(job, request);
    if (job.getStatus() == null) {
      job.setStatus(JobStatus.SCHEDULED);
    }
    return deliveryJobs.save(job);
  }

  @Override
  public DeliveryJob updateDeliveryJob(Long id, UpdateJobRequest request) {
    DeliveryJob job =
        fulfillmentQueryRepository
            .fetchDeliveryJobById(id)
            .orElseThrow(() -> new IllegalArgumentException("Delivery job not found: " + id));
    applyDeliveryDetails(job, request);
    if (job.getStatus() == JobStatus.COMPLETED && job.getDeliveredAt() == null) {
      job.setDeliveredAt(LocalDateTime.now());
    }
    return deliveryJobs.save(job);
  }

  @Override
  public ReturnPickupJob updateReturnJob(Long id, UpdateJobRequest request) {
    ReturnPickupJob job =
        fulfillmentQueryRepository
            .fetchReturnPickupJobById(id)
            .orElseThrow(() -> new IllegalArgumentException("Return pickup job not found: " + id));
    if (request.getStatus() != null) {
      job.setStatus(request.getStatus());
    }
    if (request.getDriverName() != null) {
      job.setDriverName(request.getDriverName());
    }
    if (request.getDriverPhone() != null) {
      job.setDriverPhone(request.getDriverPhone());
    }
    if (request.getVehicleNumber() != null) {
      job.setVehicleNumber(request.getVehicleNumber());
    }
    if (request.getScheduledFor() != null) {
      job.setScheduledFor(request.getScheduledFor());
    }
    if (request.getNotes() != null) {
      job.setPickupNotes(request.getNotes());
    }
    if (job.getStatus() == JobStatus.COMPLETED && job.getCollectedAt() == null) {
      job.setCollectedAt(LocalDateTime.now());
    }
    return returnJobs.save(job);
  }

  private void applyDeliveryDetails(DeliveryJob job, UpdateJobRequest request) {
    if (request.getStatus() != null) {
      job.setStatus(request.getStatus());
    }
    if (request.getDriverName() != null) {
      job.setDriverName(request.getDriverName());
    }
    if (request.getDriverPhone() != null) {
      job.setDriverPhone(request.getDriverPhone());
    }
    if (request.getVehicleNumber() != null) {
      job.setVehicleNumber(request.getVehicleNumber());
    }
    if (request.getScheduledFor() != null) {
      job.setScheduledFor(request.getScheduledFor());
    }
    if (request.getEtaStart() != null) {
      job.setEtaStart(request.getEtaStart());
    }
    if (request.getEtaEnd() != null) {
      job.setEtaEnd(request.getEtaEnd());
    }
    if (request.getReceiverName() != null) {
      job.setReceiverName(request.getReceiverName());
    }
    if (request.getReceiverPhone() != null) {
      job.setReceiverPhone(request.getReceiverPhone());
    }
    if (request.getNotes() != null) {
      job.setDeliveryNotes(request.getNotes());
    }
  }
}
