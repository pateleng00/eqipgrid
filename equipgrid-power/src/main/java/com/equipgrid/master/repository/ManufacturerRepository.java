package com.equipgrid.master.repository;

import com.equipgrid.master.entity.Manufacturer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ManufacturerRepository extends JpaRepository<Manufacturer, Long> {
    List<Manufacturer> findByActiveTrueOrderByNameAsc();

    List<Manufacturer> findAllByOrderByNameAsc();

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByNameIgnoreCase(String name);
}
