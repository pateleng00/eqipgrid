package com.equipgrid.location.repository;

import com.equipgrid.location.entity.Hub;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HubRepository extends JpaRepository<Hub, Long> {
  @EntityGraph(attributePaths = {"city", "city.state"})
  List<Hub> findByCityIdAndActiveTrueOrderByNameAsc(Long cityId);

  @EntityGraph(attributePaths = {"city", "city.state"})
  List<Hub> findByActiveTrueOrderByNameAsc();

  @EntityGraph(attributePaths = {"city", "city.state"})
  Optional<Hub> findByCodeIgnoreCase(String code);
}
