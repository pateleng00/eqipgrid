package com.equipgrid.common.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import java.util.Arrays;
import java.util.concurrent.TimeUnit;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * High-performance in-memory caching configuration powered by Caffeine.
 * Provides 24-hour TTL for master data (equipment types, OEMs, location hubs).
 */
@Configuration
@EnableCaching
public class CacheConfig {

  public static final String CACHE_EQUIPMENT_TYPES = "equipmentTypes";
  public static final String CACHE_EQUIPMENT_TYPES_BY_CATEGORY = "equipmentTypesByCategory";
  public static final String CACHE_MANUFACTURERS = "manufacturers";
  public static final String CACHE_LOCATION_HIERARCHY = "locationHierarchy";
  public static final String CACHE_HUBS = "hubs";
  public static final String CACHE_MACHINE_MODELS = "machineModels";

  @Bean
  public CacheManager cacheManager() {
    CaffeineCacheManager cacheManager = new CaffeineCacheManager();
    cacheManager.setCacheNames(
        Arrays.asList(
            CACHE_EQUIPMENT_TYPES,
            CACHE_EQUIPMENT_TYPES_BY_CATEGORY,
            CACHE_MANUFACTURERS,
            CACHE_LOCATION_HIERARCHY,
            CACHE_HUBS,
            CACHE_MACHINE_MODELS));
    cacheManager.setCaffeine(
        Caffeine.newBuilder()
            .expireAfterWrite(24, TimeUnit.HOURS)
            .maximumSize(1000)
            .recordStats());
    return cacheManager;
  }
}
