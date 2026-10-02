package com.equipgrid.whatsapp.repository;

import com.equipgrid.whatsapp.entity.WhatsAppConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WhatsAppConversationRepository extends JpaRepository<WhatsAppConversation, Long> {
}
