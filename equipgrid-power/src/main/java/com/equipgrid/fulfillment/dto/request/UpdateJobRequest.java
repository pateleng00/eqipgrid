package com.equipgrid.fulfillment.dto.request;

import com.equipgrid.fulfillment.enums.JobStatus;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class UpdateJobRequest {
  private JobStatus status;
  private String driverName;
  private String driverPhone;
  private String vehicleNumber;
  private LocalDateTime scheduledFor;
  private LocalDateTime etaStart;
  private LocalDateTime etaEnd;
  private String receiverName;
  private String receiverPhone;
  private String notes;
}
