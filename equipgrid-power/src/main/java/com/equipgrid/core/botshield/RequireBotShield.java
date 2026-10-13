package com.equipgrid.core.botshield;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation requiring incoming requests to provide a valid Cloudflare Turnstile token
 * in the X-Turnstile-Token or cf-turnstile-response request header.
 * Disallows headless bots, curl scripts, and automated scrapers.
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RequireBotShield {

    /**
     * Whether bot shield check is required. Defaults to true.
     */
    boolean required() default true;
}
