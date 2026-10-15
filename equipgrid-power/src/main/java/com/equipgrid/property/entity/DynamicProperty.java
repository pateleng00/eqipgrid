package com.equipgrid.property.entity;

import com.equipgrid.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "dynamic_properties")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DynamicProperty extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "\"key\"", nullable = false, unique = true, length = 128)
  private String key;

  @Column(name = "\"value\"", columnDefinition = "TEXT")
  private String value;

  @Column(name = "url", columnDefinition = "TEXT")
  private String url;
}
