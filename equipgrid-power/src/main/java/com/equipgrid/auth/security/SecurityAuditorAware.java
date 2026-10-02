package com.equipgrid.auth.security;

import com.equipgrid.auth.entity.User;
import org.springframework.data.domain.AuditorAware;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * AuditorAware provider for Spring Data JPA Auditing.
 * Automatically injects the authenticated User's ID into {@code created_by} and {@code updated_by}.
 * Falls back to 1L (Default System Admin ID) when unauthenticated or during automated system tasks.
 */
@Component("auditorAware")
public class SecurityAuditorAware implements AuditorAware<Long> {

    public static final Long DEFAULT_SYSTEM_USER_ID = 1L;

    @Override
    public Optional<Long> getCurrentAuditor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated() || authentication instanceof AnonymousAuthenticationToken) {
            return Optional.of(DEFAULT_SYSTEM_USER_ID);
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof User user && user.getId() != null) {
            return Optional.of(user.getId());
        }

        return Optional.of(DEFAULT_SYSTEM_USER_ID);
    }
}
