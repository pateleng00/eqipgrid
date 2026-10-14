package com.equipgrid.master.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModelRequest {

    @NotNull(message = "Equipment type ID is required")
    private Long typeId;

    @NotNull(message = "Manufacturer ID is required")
    private Long manufacturerId;

    @NotBlank(message = "Model name is required")
    private String name;

    private String modelNumber;

    private String specs;
}
