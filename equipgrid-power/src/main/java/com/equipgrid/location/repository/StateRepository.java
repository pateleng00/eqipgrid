package com.equipgrid.location.repository;

import com.equipgrid.location.entity.State;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StateRepository extends JpaRepository<State, Long> {
    List<State> findByActiveTrueOrderByNameAsc();
    Optional<State> findByCodeIgnoreCase(String code);
}
