package com.equipgrid.dealer.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateDealerRequest {
    @NotBlank(message = "Contact person name is required")
    private String name;

    @NotBlank(message = "Trade/Shop name is required")
    private String tradeName;

    @NotBlank(message = "Phone is required")
    private String phone;

    @NotBlank(message = "Location is required (e.g. Hardoi, Sandila, Bilgram)")
    private String location;

    @Builder.Default
    private BigDecimal commissionRate = new BigDecimal("0.0600");
}
