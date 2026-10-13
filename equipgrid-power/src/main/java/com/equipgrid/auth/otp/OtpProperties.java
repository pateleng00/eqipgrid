package com.equipgrid.auth.otp;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;


@Data
@Component
@ConfigurationProperties(prefix = "equipgrid.otp")
public class OtpProperties {
    private boolean enabled = true;
    private int expiryMinutes = 5;
    private int proofTokenExpiryMinutes = 15;
    private int maxAttempts = 3;
    private String devBypassCode = "";
}
