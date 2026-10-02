package com.equipgrid.auth.dto.model;

import com.equipgrid.auth.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthUserDetails {
    private Long id;
    private String username;
    private String fullName;
    private Role role;
    private boolean active;
}
