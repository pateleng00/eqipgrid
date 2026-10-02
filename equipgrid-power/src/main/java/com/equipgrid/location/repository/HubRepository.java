package com.equipgrid.location.repository;

import com.equipgrid.location.entity.Hub;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HubRepository extends JpaRepository<Hub, Long> {
    List<Hub> findByCityIdAndActiveTrueOrderByNameAsc(Long cityId);
    List<Hub> findByActiveTrueOrderByNameAsc();
    Optional<Hub> findByCodeIgnoreCase(String code);
}
