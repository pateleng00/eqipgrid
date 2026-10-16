package com.equipgrid.dealer.entity;

import com.equipgrid.common.BaseEntity;
import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.*;

@Entity
@Table(name = "dealers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Dealer extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 128)
  private String name;

  @Column(name = "trade_name", nullable = false, length = 128)
  private String tradeName;

  @Column(nullable = false, unique = true, length = 20)
  private String phone;

  @Column(nullable = false, length = 128)
  private String location;

  @Column(name = "commission_rate", precision = 5, scale = 4)
  private BigDecimal commissionRate;

  @Builder.Default
  @Column(nullable = false)
  private Boolean active = true;
}
