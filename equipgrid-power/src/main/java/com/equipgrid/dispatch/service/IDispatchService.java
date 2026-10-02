package com.equipgrid.dispatch.service;

import com.equipgrid.dispatch.dto.request.CreateDispatchRequest;
import com.equipgrid.dispatch.entity.DispatchRecord;

public interface IDispatchService {
    DispatchRecord getByBookingId(Long bookingId);
    DispatchRecord executeDispatch(CreateDispatchRequest request, String performedBy);
}
