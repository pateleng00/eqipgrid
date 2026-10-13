package com.equipgrid.core.ratelimiter;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

@Slf4j
@Component
@RequiredArgsConstructor
public class RateLimitInterceptor implements HandlerInterceptor {

    private final RateLimiterService rateLimiterService;
    private final RateLimiterProperties properties;
    private final ObjectMapper objectMapper;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (!properties.isEnabled()) {
            return true;
        }

        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }

        RateLimited annotation = handlerMethod.getMethodAnnotation(RateLimited.class);
        if (annotation == null) {
            annotation = handlerMethod.getBeanType().getAnnotation(RateLimited.class);
        }

        if (annotation == null) {
            return true;
        }

        int limit = annotation.limit() > 0 ? annotation.limit() : properties.getDefaultLimit();
        long duration = annotation.durationSeconds() > 0 ? annotation.durationSeconds() : properties.getDefaultDurationSeconds();
        String actionName = !annotation.name().isBlank() ? annotation.name() : handlerMethod.getMethod().getName();

        String clientIdentifier = resolveClientIdentifier(request, annotation.perUser());
        String bucketKey = "rl:" + actionName + ":" + clientIdentifier;

        RateLimitResult result = rateLimiterService.check(bucketKey, limit, duration);

        response.setHeader("X-RateLimit-Limit", String.valueOf(result.limit()));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(result.remaining()));
        response.setHeader("X-RateLimit-Reset", String.valueOf(result.resetSeconds()));

        if (!result.allowed()) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf(result.resetSeconds()));
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");

            String message = String.format(
                    "Too many requests. Maximum %d calls per %d seconds allowed. Please retry after %d seconds.",
                    result.limit(), duration, result.resetSeconds()
            );

            ApiResponse<Object> errorBody = ApiResponse.buildFail("EG_429", message);
            response.getWriter().write(objectMapper.writeValueAsString(errorBody));
            return false;
        }

        return true;
    }

    private String resolveClientIdentifier(HttpServletRequest request, boolean perUser) {
        if (perUser) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                return "user:" + auth.getName();
            }
        }

        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return "ip:" + forwarded.split(",")[0].trim();
        }

        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return "ip:" + realIp.trim();
        }

        return "ip:" + request.getRemoteAddr();
    }
}
