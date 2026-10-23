package com.equipgrid.whatsapp.repository;

import com.equipgrid.whatsapp.entity.QWhatsAppConversation;
import com.equipgrid.whatsapp.entity.WhatsAppConversation;
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
public class WhatsAppConversationQueryRepository {

  private final JPAQueryFactory queryFactory;
  private final QWhatsAppConversation qConversation = QWhatsAppConversation.whatsAppConversation;

  public Optional<WhatsAppConversation> fetchByPhone(String phone) {
    if (phone == null || phone.isBlank()) {
      return Optional.empty();
    }
    String trimmed = phone.trim();
    String digits = trimmed.replaceAll("[^0-9]", "");

    BooleanBuilder predicate = new BooleanBuilder();
    predicate.or(qConversation.phoneNumber.eq(trimmed));
    if (!digits.isBlank()) {
      predicate.or(qConversation.phoneNumber.eq(digits));
      if (digits.length() >= 10) {
        String last10 = digits.substring(digits.length() - 10);
        predicate.or(qConversation.phoneNumber.eq(last10));
        predicate.or(qConversation.phoneNumber.eq("+91" + last10));
        predicate.or(qConversation.phoneNumber.eq("91" + last10));
        predicate.or(qConversation.phoneNumber.eq("0" + last10));
        predicate.or(qConversation.phoneNumber.endsWith(last10));
      }
    }

    return Optional.ofNullable(
        queryFactory
            .selectFrom(qConversation)
            .where(predicate)
            .orderBy(qConversation.id.asc())
            .fetchFirst());
  }

  public List<WhatsAppConversation> fetchAll() {
    return queryFactory
        .selectFrom(qConversation)
        .orderBy(qConversation.lastInteractionAt.desc())
        .fetch();
  }
}
