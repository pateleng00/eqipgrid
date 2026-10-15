package com.equipgrid.core.ratelimiter;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class RateLimiterService {

  private final RateLimiterProperties properties;

  // In-memory sliding window bucket store: key -> Deque of epoch millisecond timestamps
  private final ConcurrentHashMap<String, Deque<Long>> buckets = new ConcurrentHashMap<>();

  /**
   * Evaluates rate limit for a given key using a precise sliding window.
   *
   * @param key Composite rate limiting key (e.g. rl:create_booking:ip:192.168.1.1)
   * @param limit Allowed calls count (if <= 0 uses default)
   * @param durationSeconds Duration window in seconds (if <= 0 uses default)
   * @return RateLimitResult indicating allowed/denied status and header metrics
   */
  public RateLimitResult check(String key, int limit, long durationSeconds) {
    if (!properties.isEnabled()) {
      return RateLimitResult.permit(0, limit, limit, 0);
    }

    int effectiveLimit = limit > 0 ? limit : properties.getDefaultLimit();
    long effectiveDuration =
        durationSeconds > 0 ? durationSeconds : properties.getDefaultDurationSeconds();
    long windowMillis = effectiveDuration * 1000L;
    long now = System.currentTimeMillis();
    long windowStart = now - windowMillis;

    Deque<Long> timestamps = buckets.computeIfAbsent(key, k -> new ArrayDeque<>());

    synchronized (timestamps) {
      // Prune timestamps outside current sliding window
      while (!timestamps.isEmpty() && timestamps.peekFirst() <= windowStart) {
        timestamps.pollFirst();
      }

      int currentCount = timestamps.size();

      if (currentCount < effectiveLimit) {
        timestamps.addLast(now);
        long remaining = effectiveLimit - timestamps.size();
        long oldest = timestamps.peekFirst() != null ? timestamps.peekFirst() : now;
        long resetSeconds = Math.max(1, (oldest + windowMillis - now) / 1000);
        return RateLimitResult.permit(timestamps.size(), effectiveLimit, remaining, resetSeconds);
      } else {
        long oldest = timestamps.peekFirst() != null ? timestamps.peekFirst() : now;
        long resetSeconds = Math.max(1, (oldest + windowMillis - now) / 1000);
        log.warn(
            "[RateLimiter] Limit exceeded for key='{}' (limit={}/{}s, retry in {}s)",
            key,
            effectiveLimit,
            effectiveDuration,
            resetSeconds);
        return RateLimitResult.deny(currentCount, effectiveLimit, resetSeconds);
      }
    }
  }

  /** Periodic cleanup to evict stale buckets and avoid memory leakage. Runs every 5 minutes. */
  @Scheduled(fixedRate = 300000)
  public void purgeStaleBuckets() {
    long now = System.currentTimeMillis();
    long maxWindow = 3600000L; // 1 hour threshold for inactive keys
    int removed = 0;

    Iterator<Map.Entry<String, Deque<Long>>> it = buckets.entrySet().iterator();
    while (it.hasNext()) {
      Map.Entry<String, Deque<Long>> entry = it.next();
      Deque<Long> deque = entry.getValue();
      synchronized (deque) {
        if (deque.isEmpty() || (now - deque.peekLast()) > maxWindow) {
          it.remove();
          removed++;
        }
      }
    }
    if (removed > 0) {
      log.debug(
          "[RateLimiter] Purged {} inactive rate limit buckets. Active count: {}",
          removed,
          buckets.size());
    }
  }
}
