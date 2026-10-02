package com.equipgrid.whatsapp.entity;

import com.equipgrid.common.BaseEntity;
import com.equipgrid.whatsapp.enums.WhatsAppState;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "whatsapp_conversations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WhatsAppConversation extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "phone_number", nullable = false, unique = true, length = 30)
    private String phoneNumber;

    @Builder.Default
    @Column(nullable = false)
    private WhatsAppState state = WhatsAppState.MAIN_MENU;

    @Column(name = "context_data", columnDefinition = "TEXT")
    private String contextData;

    @Column(name = "last_message_received", columnDefinition = "TEXT")
    private String lastMessageReceived;

    @Builder.Default
    @Column(name = "last_interaction_at")
    private LocalDateTime lastInteractionAt = LocalDateTime.now();
}
