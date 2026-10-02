package com.equipgrid.dealer.service;

import com.equipgrid.audit.service.IAuditService;
import com.equipgrid.booking.entity.Booking;
import com.equipgrid.common.Exceptions;
import com.equipgrid.dealer.dto.request.CreateDealerRequest;
import com.equipgrid.dealer.dto.response.DealerSummaryResponse;
import com.equipgrid.dealer.entity.Dealer;
import com.equipgrid.dealer.entity.DealerCommission;
import com.equipgrid.dealer.enums.CommissionStatus;
import com.equipgrid.dealer.repository.DealerCommissionRepository;
import com.equipgrid.dealer.repository.DealerQueryRepository;
import com.equipgrid.dealer.repository.DealerRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@AllArgsConstructor
public class DealerServiceImpl implements IDealerService {

    private final DealerRepository dealerRepository;
    private final DealerCommissionRepository commissionRepository;
    private final DealerQueryRepository dealerQueryRepository;
    private final IAuditService auditService;

    @Override
    public List<DealerSummaryResponse> getAllDealers() {
        return dealerQueryRepository.fetchAllDealers().stream().map(dealer -> {
            List<DealerCommission> list = dealerQueryRepository.fetchCommissionsByDealerId(dealer.getId());
            BigDecimal sum = list.stream().map(DealerCommission::getCommissionAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            return DealerSummaryResponse.builder()
                    .id(dealer.getId())
                    .name(dealer.getName())
                    .tradeName(dealer.getTradeName())
                    .phone(dealer.getPhone())
                    .location(dealer.getLocation())
                    .commissionRate(dealer.getCommissionRate())
                    .totalCommissionEarned(sum)
                    .totalReferrals(list.size())
                    .build();
        }).collect(Collectors.toList());
    }

    @Override
    public Dealer getDealerById(Long id) {
        return dealerQueryRepository.fetchDealerById(id)
                .orElseThrow(() -> new Exceptions.ResourceNotFoundException("Dealer not found: " + id));
    }

    @Override
    @Transactional
    public Dealer createDealer(CreateDealerRequest request, String performedBy) {
        Dealer dealer = Dealer.builder()
                .name(request.getName())
                .tradeName(request.getTradeName())
                .phone(request.getPhone())
                .location(request.getLocation())
                .commissionRate(request.getCommissionRate() != null ? request.getCommissionRate() : new BigDecimal("0.0600"))
                .active(true)
                .build();

        Dealer saved = dealerRepository.save(dealer);
        auditService.log("DEALER", saved.getId().toString(), "CREATE_DEALER",
                performedBy != null ? performedBy : "ADMIN",
                "New dealer onboarded: " + saved.getName() + " (" + saved.getTradeName() + ")");
        return saved;
    }

    @Override
    @Transactional
    public DealerCommission recordReferralCommission(Booking booking) {
        if (booking.getDealerId() == null) return null;

        Dealer dealer = getDealerById(booking.getDealerId());
        BigDecimal rate = dealer.getCommissionRate() != null ? dealer.getCommissionRate() : new BigDecimal("0.0600");
        BigDecimal commissionAmt = booking.getBaseRent().multiply(rate).setScale(2, java.math.RoundingMode.HALF_UP);

        DealerCommission commission = DealerCommission.builder()
                .dealer(dealer)
                .booking(booking)
                .grossRentalRevenue(booking.getBaseRent())
                .commissionRate(rate)
                .commissionAmount(commissionAmt)
                .status(CommissionStatus.PENDING)
                .build();

        return commissionRepository.save(commission);
    }

    @Override
    @Transactional
    public DealerCommission settleCommission(Long commissionId, String performedBy) {
        DealerCommission commission = dealerQueryRepository.fetchCommissionById(commissionId)
                .orElseThrow(() -> new Exceptions.ResourceNotFoundException("Commission record not found: " + commissionId));

        commission.setStatus(CommissionStatus.SETTLED);
        commission.setSettledAt(LocalDateTime.now());
        DealerCommission updated = commissionRepository.save(commission);

        auditService.log("DEALER", commission.getDealer().getId().toString(), "COMMISSION_SETTLED",
                performedBy != null ? performedBy : "ADMIN",
                "Settled referral commission of INR " + commission.getCommissionAmount() + " for booking " + commission.getBooking().getBookingNumber());

        return updated;
    }

    @Override
    public List<DealerCommission> getCommissionsByDealer(Long dealerId) {
        return dealerQueryRepository.fetchCommissionsByDealerId(dealerId);
    }
}
