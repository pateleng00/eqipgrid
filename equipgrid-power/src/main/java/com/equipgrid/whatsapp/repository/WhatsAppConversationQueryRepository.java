package com.equipgrid.whatsapp.repository;

import com.equipgrid.whatsapp.entity.QWhatsAppConversation;
import com.equipgrid.whatsapp.entity.WhatsAppConversation;
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
public class WhatsAppConversationQueryRepository {

    private final JPAQueryFactory queryFactory;
    private final QWhatsAppConversation qConversation = QWhatsAppConversation.whatsAppConversation;

    public Optional<WhatsAppConversation> fetchByPhone(String phone) {
        if (phone == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(
                queryFactory.selectFrom(qConversation)
                        .where(qConversation.phoneNumber.eq(phone.trim()))
                        .fetchOne()
        );
    }

    public List<WhatsAppConversation> fetchAll() {
        return queryFactory.selectFrom(qConversation)
                .orderBy(qConversation.lastInteractionAt.desc())
                .fetch();
    }
}
