package com.equipgrid.auth.repository;

import com.equipgrid.auth.entity.QUser;
import com.equipgrid.auth.entity.User;
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
public class UserQueryRepository {

    private final JPAQueryFactory queryFactory;
    private final QUser qUser = QUser.user;

    public Optional<User> fetchByUsername(String username) {
        if (username == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(
                queryFactory.selectFrom(qUser)
                        .where(qUser.username.equalsIgnoreCase(username.trim()))
                        .fetchOne()
        );
    }

    public Optional<User> fetchById(Long id) {
        if (id == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(
                queryFactory.selectFrom(qUser)
                        .where(qUser.id.eq(id))
                        .fetchOne()
        );
    }

    public boolean existsByUsername(String username) {
        if (username == null) {
            return false;
        }
        Integer count = queryFactory.selectOne()
                .from(qUser)
                .where(qUser.username.equalsIgnoreCase(username.trim()))
                .fetchFirst();
        return count != null;
    }

    public List<User> fetchAll() {
        return queryFactory.selectFrom(qUser)
                .orderBy(qUser.id.desc())
                .fetch();
    }
}
