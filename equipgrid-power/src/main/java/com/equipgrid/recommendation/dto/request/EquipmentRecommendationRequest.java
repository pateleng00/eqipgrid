package com.equipgrid.recommendation.dto.request;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.time.LocalDate;
@Data public class EquipmentRecommendationRequest { @NotBlank private String task; private Long hubId; private LocalDate startDate; private LocalDate endDate; private Integer acreage; }
