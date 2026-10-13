package com.equipgrid.core.ratelimiter;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RateLimiterServiceTest {

    private RateLimiterProperties properties;
    private RateLimiterService rateLimiterService;

    @BeforeEach
    void setUp() {
        properties = new RateLimiterProperties();
        properties.setEnabled(true);
        properties.setDefaultLimit(5);
        properties.setDefaultDurationSeconds(60);
        rateLimiterService = new RateLimiterService(properties);
    }

    @Test
    void allowsRequestsUnderDefaultLimit() {
        String key = "test-client-1";
        for (int i = 1; i <= 5; i++) {
            RateLimitResult result = rateLimiterService.check(key, -1, -1);
            assertTrue(result.allowed(), "Request " + i + " should be allowed");
            assertEquals(5 - i, result.remaining());
            assertEquals(5, result.limit());
        }
    }

    @Test
    void blocksSixthRequestWhenDefaultLimitIsFive() {
        String key = "test-client-2";
        for (int i = 1; i <= 5; i++) {
            RateLimitResult result = rateLimiterService.check(key, -1, -1);
            assertTrue(result.allowed());
        }

        RateLimitResult sixth = rateLimiterService.check(key, -1, -1);
        assertFalse(sixth.allowed(), "6th request within 1 minute must be rejected with 429 rate limit");
        assertEquals(0, sixth.remaining());
        assertTrue(sixth.resetSeconds() > 0);
    }

    @Test
    void respectsCustomLimitAndWindow() {
        String key = "test-client-custom";
        // 2 calls per 10 seconds
        assertTrue(rateLimiterService.check(key, 2, 10).allowed());
        assertTrue(rateLimiterService.check(key, 2, 10).allowed());
        assertFalse(rateLimiterService.check(key, 2, 10).allowed());
    }

    @Test
    void bypassesWhenDisabled() {
        properties.setEnabled(false);
        String key = "test-disabled";
        for (int i = 0; i < 20; i++) {
            assertTrue(rateLimiterService.check(key, 2, 10).allowed());
        }
    }
}
