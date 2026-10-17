package com.equipgrid.common.controller;

import com.equipgrid.common.dto.rest.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/cache")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Cache Management", description = "Instant cache eviction and invalidation controls")
public class CacheManagementController {

  private final CacheManager cacheManager;

  @GetMapping({"/clear", "/evict-all"})
  @Operation(
      summary = "Instantly invalidate and clear all in-memory cache items (or a specific cache)",
      description =
          "Flushes 24h cached equipment types, hubs, OEMs, and models so updates reflect immediately.")
  public ResponseEntity<ApiResponse<Map<String, Object>>> clearCache(
      @RequestParam(required = false) String cacheName) {

    Map<String, Object> result = new LinkedHashMap<>();
    Collection<String> cacheNames = cacheManager.getCacheNames();

    if (cacheName != null && !cacheName.isBlank()) {
      String target = cacheName.trim();
      Cache cache = cacheManager.getCache(target);
      if (cache != null) {
        cache.clear();
        log.info("Explicitly evicted cache: '{}'", target);
        result.put("status", "SUCCESS");
        result.put("clearedCache", target);
        result.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(ApiResponse.buildSuccess("Cache cleared: " + target, result));
      } else {
        result.put("status", "NOT_FOUND");
        result.put("requestedCache", target);
        result.put("availableCaches", cacheNames);
        return ResponseEntity.badRequest()
            .body(ApiResponse.buildSuccess("Cache not found: " + target, result));
      }
    }

    // Evict all caches
    int count = 0;
    for (String name : cacheNames) {
      Cache cache = cacheManager.getCache(name);
      if (cache != null) {
        cache.clear();
        count++;
      }
    }

    log.info("Flushed all {} caches: {}", count, cacheNames);
    result.put("status", "SUCCESS");
    result.put("clearedCaches", cacheNames);
    result.put("cacheCount", count);
    result.put("timestamp", System.currentTimeMillis());

    return ResponseEntity.ok(
        ApiResponse.buildSuccess("All in-memory master caches successfully invalidated", result));
  }

  @GetMapping("/status")
  @Operation(summary = "Get list of active caches")
  public ResponseEntity<ApiResponse<Map<String, Object>>> getCacheStatus() {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("cacheNames", cacheManager.getCacheNames());
    result.put("ttl", "24 Hours");
    result.put("timestamp", System.currentTimeMillis());
    return ResponseEntity.ok(ApiResponse.buildSuccess("Active cache status", result));
  }
}
