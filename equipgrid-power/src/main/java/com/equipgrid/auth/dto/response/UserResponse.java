package com.equipgrid.auth.dto.response;

import com.equipgrid.auth.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private Long id;
    private String username;
    private String email;
    private String fullName;
    private Role role;
    private String roleTitle;
    private String phone;
    private Long hubId;
    private String hubName;
    private String hubCode;
    private Boolean active;
    private LocalDateTime createdAt;
}
