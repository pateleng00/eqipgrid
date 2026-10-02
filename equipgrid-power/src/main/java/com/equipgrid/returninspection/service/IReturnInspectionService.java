package com.equipgrid.returninspection.service;

import com.equipgrid.returninspection.dto.request.CreateInspectionRequest;
import com.equipgrid.returninspection.dto.response.SettlementCalculationResponse;
import com.equipgrid.returninspection.entity.ReturnInspection;

import java.util.List;

public interface IReturnInspectionService {
    List<ReturnInspection> getInspectionsByBooking(Long bookingId);
    ReturnInspection executeInspection(CreateInspectionRequest request, String performedBy);
    SettlementCalculationResponse calculateDepositSettlement(Long bookingId);
}
