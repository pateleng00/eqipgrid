package com.equipgrid.auth.controller;

import com.equipgrid.auth.dto.request.CreateUserRequest;
import com.equipgrid.auth.dto.request.UpdateUserRequest;
import com.equipgrid.auth.dto.response.UserResponse;
import com.equipgrid.auth.entity.User;
import com.equipgrid.auth.enums.Role;
import com.equipgrid.auth.service.IUserService;
import com.equipgrid.common.dto.rest.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@AllArgsConstructor
@RequestMapping("/users")
@Tag(name = "User Management & RBAC", description = "Management of Root, Admin, Manager, and Station staff")
public class UserController {

    private final IUserService userService;

    @GetMapping
    @Operation(summary = "List users with optional hub and role filtering")
    public ResponseEntity<ApiResponse<List<UserResponse>>> listUsers(
            @RequestParam(required = false) Long hubId,
            @RequestParam(required = false) Role role,
            @AuthenticationPrincipal User currentUser) {
        List<UserResponse> users = userService.getAllUsers(currentUser, hubId, role);
        return ResponseEntity.ok(ApiResponse.buildSuccess(users));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get user details by ID")
    public ResponseEntity<ApiResponse<UserResponse>> getUser(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        UserResponse user = userService.getUserById(id, currentUser);
        return ResponseEntity.ok(ApiResponse.buildSuccess(user));
    }

    @PostMapping
    @Operation(summary = "Create new user account (Root, Admin, Manager, Operator)")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(
            @Valid @RequestBody CreateUserRequest request,
            @AuthenticationPrincipal User currentUser) {
        UserResponse created = userService.createUser(request, currentUser);
        return ResponseEntity.ok(ApiResponse.buildSuccess("User created successfully", created));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update user account details")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request,
            @AuthenticationPrincipal User currentUser) {
        UserResponse updated = userService.updateUser(id, request, currentUser);
        return ResponseEntity.ok(ApiResponse.buildSuccess("User updated successfully", updated));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete user account")
    public ResponseEntity<ApiResponse<Object>> deleteUser(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        userService.deleteUser(id, currentUser);
        return ResponseEntity.ok(ApiResponse.buildSuccess("User deleted successfully"));
    }
}
