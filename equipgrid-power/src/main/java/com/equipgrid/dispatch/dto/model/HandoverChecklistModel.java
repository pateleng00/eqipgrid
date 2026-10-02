package com.equipgrid.dispatch.dto.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HandoverChecklistModel {
    private String itemKey;
    private String itemName;
    private boolean checked;
    private String remarks;
}
