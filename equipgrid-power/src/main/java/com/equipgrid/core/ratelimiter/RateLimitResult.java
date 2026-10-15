package com.equipgrid.core.ratelimiter;

public record RateLimitResult(
    boolean allowed, long currentCount, long limit, long remaining, long resetSeconds) {
  public static RateLimitResult permit(
      long currentCount, long limit, long remaining, long resetSeconds) {
    return new RateLimitResult(true, currentCount, limit, remaining, resetSeconds);
  }

  public static RateLimitResult deny(long currentCount, long limit, long resetSeconds) {
    return new RateLimitResult(false, currentCount, limit, 0, resetSeconds);
  }
}
