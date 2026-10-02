package com.equipgrid.reporting.dto.model;

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
public class CashLedgerSummaryModel {
    private LocalDate transactionDate;
    private String paymentChannel;
    private BigDecimal totalInflow;
    private BigDecimal totalOutflow;
    private BigDecimal netBalance;
}
