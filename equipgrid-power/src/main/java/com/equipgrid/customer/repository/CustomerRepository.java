package com.equipgrid.customer.repository;

import com.equipgrid.customer.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence repository for Customer entity.
 * Read and fetch queries are moved to CustomerQueryRepository (QueryDSL).
 */
@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
}
