package com.equipgrid.asset.dto.request;

import com.equipgrid.asset.enums.AssetStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateStatusRequest {
    @NotNull(message = "New status is required")
    private AssetStatus status;
    private String conditionNotes;
}
