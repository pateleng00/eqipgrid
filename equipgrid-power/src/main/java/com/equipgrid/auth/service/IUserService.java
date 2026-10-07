package com.equipgrid.auth.service;

import com.equipgrid.auth.dto.request.CreateUserRequest;
import com.equipgrid.auth.dto.request.UpdateUserRequest;
import com.equipgrid.auth.dto.response.UserResponse;
import com.equipgrid.auth.entity.User;
import com.equipgrid.auth.enums.Role;

import java.util.List;

public interface IUserService {

    List<UserResponse> getAllUsers(User caller, Long hubId, Role role);

    UserResponse getUserById(Long id, User caller);

    UserResponse createUser(CreateUserRequest request, User caller);

    UserResponse updateUser(Long id, UpdateUserRequest request, User caller);

    void deleteUser(Long id, User caller);
}
