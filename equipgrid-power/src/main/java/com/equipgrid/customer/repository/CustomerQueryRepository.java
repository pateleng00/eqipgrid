package com.equipgrid.customer.repository;

import com.equipgrid.customer.entity.Customer;
import com.equipgrid.customer.entity.QCustomer;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.util.List;
import java.util.Optional;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Repository
@AllArgsConstructor
@Transactional(readOnly = true)
public class CustomerQueryRepository {

  private final JPAQueryFactory queryFactory;
  private final QCustomer qCustomer = QCustomer.customer;

  public List<Customer> fetchAll() {
    return queryFactory
        .selectFrom(qCustomer)
        .leftJoin(qCustomer.hub)
        .fetchJoin()
        .orderBy(qCustomer.id.desc())
        .fetch();
  }

  public Optional<Customer> fetchById(Long id) {
    if (id == null) {
      return Optional.empty();
    }
    return Optional.ofNullable(
        queryFactory
            .selectFrom(qCustomer)
            .leftJoin(qCustomer.hub)
            .fetchJoin()
            .where(qCustomer.id.eq(id))
            .fetchOne());
  }

  public Optional<Customer> fetchByPhone(String phone) {
    if (phone == null || phone.isBlank()) {
      return Optional.empty();
    }
    String trimmed = phone.trim();
    String digits = trimmed.replaceAll("[^0-9]", "");

    BooleanBuilder predicate = new BooleanBuilder();
    predicate.or(qCustomer.phone.eq(trimmed));
    if (!digits.isBlank()) {
      predicate.or(qCustomer.phone.eq(digits));
      if (digits.length() >= 10) {
        String last10 = digits.substring(digits.length() - 10);
        predicate.or(qCustomer.phone.eq(last10));
        predicate.or(qCustomer.phone.eq("+91" + last10));
        predicate.or(qCustomer.phone.eq("91" + last10));
        predicate.or(qCustomer.phone.eq("0" + last10));
        predicate.or(qCustomer.phone.endsWith(last10));
      }
    }

    return Optional.ofNullable(
        queryFactory
            .selectFrom(qCustomer)
            .where(predicate)
            .orderBy(qCustomer.id.asc())
            .fetchFirst());
  }
}
