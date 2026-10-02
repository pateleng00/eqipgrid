package com.equipgrid.dealer.service;

import com.equipgrid.booking.entity.Booking;
import com.equipgrid.dealer.dto.request.CreateDealerRequest;
import com.equipgrid.dealer.dto.response.DealerSummaryResponse;
import com.equipgrid.dealer.entity.Dealer;
import com.equipgrid.dealer.entity.DealerCommission;

import java.util.List;

public interface IDealerService {
    List<DealerSummaryResponse> getAllDealers();

    Dealer getDealerById(Long id);

    Dealer createDealer(CreateDealerRequest request, String performedBy);

    DealerCommission recordReferralCommission(Booking booking);

    DealerCommission settleCommission(Long commissionId, String performedBy);

    List<DealerCommission> getCommissionsByDealer(Long dealerId);
}
