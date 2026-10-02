package com.equipgrid.reporting.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyCashReconciliationResponse {
    private LocalDate date;
    private BigDecimal openingCash;
    private BigDecimal cashReceipts;
    private BigDecimal upiReceipts;
    private BigDecimal bankReceipts;
    private BigDecimal totalReceipts;
    private BigDecimal totalExpenses;
    private BigDecimal totalRefunds;
    private BigDecimal closingPosition;
    private String reconciliationStatus;
}
