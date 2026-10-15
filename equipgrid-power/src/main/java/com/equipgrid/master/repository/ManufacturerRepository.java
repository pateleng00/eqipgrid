package com.equipgrid.master.repository;

import com.equipgrid.master.entity.Manufacturer;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ManufacturerRepository extends JpaRepository<Manufacturer, Long> {
  List<Manufacturer> findByActiveTrueOrderByNameAsc();

  List<Manufacturer> findAllByOrderByNameAsc();

  boolean existsByCodeIgnoreCase(String code);

  boolean existsByNameIgnoreCase(String name);
}
