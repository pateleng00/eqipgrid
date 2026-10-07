package com.equipgrid.auth.dto.request;

import com.equipgrid.auth.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {

    private String fullName;
    private String email;
    private String password;
    private String phone;
    private Role role;
    private Long hubId;
    private Boolean active;
}
