package com.equipgrid.core.botshield;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * HandlerInterceptor enforcing Cloudflare Turnstile token validation on controller endpoints
 * annotated with @RequireBotShield.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BotShieldInterceptor implements HandlerInterceptor {

  private final TurnstileVerificationService turnstileService;
  private final TurnstileProperties properties;
  private final ObjectMapper objectMapper;

  @Override
  public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
      throws Exception {
    if (!properties.isEnabled()) {
      return true;
    }

    if (!(handler instanceof HandlerMethod handlerMethod)) {
      return true;
    }

    RequireBotShield annotation = handlerMethod.getMethodAnnotation(RequireBotShield.class);
    if (annotation == null) {
      annotation = handlerMethod.getBeanType().getAnnotation(RequireBotShield.class);
    }

    if (annotation == null || !annotation.required()) {
      return true;
    }

    // Authenticated staff and admins are trusted and bypass the public bot shield
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
      for (GrantedAuthority authority : auth.getAuthorities()) {
        String role = authority.getAuthority();
        if ("ROLE_ADMIN".equals(role)
            || "ROLE_STAFF".equals(role)
            || "ROLE_DISPATCHER".equals(role)) {
          return true;
        }
      }
    }

    // Extract token from request headers
    String token = request.getHeader("X-Turnstile-Token");
    if (token == null || token.isBlank()) {
      token = request.getHeader("cf-turnstile-response");
    }

    String clientIp = resolveClientIp(request);
    boolean isHuman = turnstileService.verifyToken(token, clientIp);

    if (!isHuman) {
      log.warn(
          "[BotShield] Denied request to {} from IP {} due to missing/invalid Turnstile token",
          request.getRequestURI(),
          clientIp);

      response.setStatus(HttpStatus.FORBIDDEN.value());
      response.setContentType(MediaType.APPLICATION_JSON_VALUE);
      response.setCharacterEncoding("UTF-8");

      ApiResponse<Object> errorBody =
          ApiResponse.buildFail(
              "EG_BOT_SHIELD_403",
              "Bot verification failed: Missing or invalid Cloudflare Turnstile token. Direct script execution disallowed.");
      response.getWriter().write(objectMapper.writeValueAsString(errorBody));
      return false;
    }

    return true;
  }

  private String resolveClientIp(HttpServletRequest request) {
    String forwarded = request.getHeader("X-Forwarded-For");
    if (forwarded != null && !forwarded.isBlank()) {
      return forwarded.split(",")[0].trim();
    }
    String realIp = request.getHeader("X-Real-IP");
    if (realIp != null && !realIp.isBlank()) {
      return realIp.trim();
    }
    return request.getRemoteAddr();
  }
}
