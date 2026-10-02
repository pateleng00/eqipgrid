package com.equipgrid.auth.repository;

import com.equipgrid.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence repository for User entity.
 * QueryDSL user lookups are in UserQueryRepository.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
}
