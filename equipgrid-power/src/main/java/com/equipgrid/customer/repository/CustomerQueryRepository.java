package com.equipgrid.customer.repository;

import com.equipgrid.customer.entity.Customer;
import com.equipgrid.customer.entity.QCustomer;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Slf4j
@Repository
@AllArgsConstructor
@Transactional(readOnly = true)
public class CustomerQueryRepository {

    private final JPAQueryFactory queryFactory;
    private final QCustomer qCustomer = QCustomer.customer;

    public List<Customer> fetchAll() {
        return queryFactory.selectFrom(qCustomer)
                .orderBy(qCustomer.id.desc())
                .fetch();
    }

    public Optional<Customer> fetchById(Long id) {
        if (id == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(
                queryFactory.selectFrom(qCustomer)
                        .where(qCustomer.id.eq(id))
                        .fetchOne()
        );
    }

    public Optional<Customer> fetchByPhone(String phone) {
        if (phone == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(
                queryFactory.selectFrom(qCustomer)
                        .where(qCustomer.phone.eq(phone.trim()))
                        .fetchOne()
        );
    }
}
