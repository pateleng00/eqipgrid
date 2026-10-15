package com.equipgrid.location.repository;

import com.equipgrid.location.entity.City;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CityRepository extends JpaRepository<City, Long> {
  List<City> findByStateIdAndActiveTrueOrderByNameAsc(Long stateId);

  List<City> findByActiveTrueOrderByNameAsc();
}
