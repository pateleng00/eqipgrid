package com.equipgrid.fulfillment.service;

import com.equipgrid.fulfillment.dto.request.UpdateJobRequest;
import com.equipgrid.fulfillment.entity.DeliveryJob;
import com.equipgrid.fulfillment.entity.ReturnPickupJob;
import java.util.List;

public interface IFulfillmentService {

  List<DeliveryJob> getAllDeliveries();

  List<ReturnPickupJob> getAllReturns();

  DeliveryJob createOrUpdateDeliveryForBooking(Long bookingId, UpdateJobRequest request);

  DeliveryJob updateDeliveryJob(Long id, UpdateJobRequest request);

  ReturnPickupJob updateReturnJob(Long id, UpdateJobRequest request);
}
