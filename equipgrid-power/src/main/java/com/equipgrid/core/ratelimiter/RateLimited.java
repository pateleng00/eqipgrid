package com.equipgrid.core.ratelimiter;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimited {
  int limit() default -1;

  long durationSeconds() default -1;

  String name() default "";

  boolean perUser() default true;
}
