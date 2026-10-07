package com.equipgrid.auth.controller;

import com.equipgrid.auth.dto.request.LoginRequest;
import com.equipgrid.auth.dto.request.RegisterRequest;
import com.equipgrid.auth.dto.response.AuthResponse;
import com.equipgrid.auth.service.IAuthService;
import com.equipgrid.common.dto.rest.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@AllArgsConstructor
@RequestMapping("/auth")
@Tag(name = "Authentication & Access", description = "User authentication and JWT issuance")
public class AuthController {

    private final IAuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Authenticate user and return JWT bearer token")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.buildSuccess("Login successful", response));
    }

    @PostMapping("/register")
    @Operation(summary = "Register new staff or customer account")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.ok(ApiResponse.buildSuccess("Registration successful", response));
    }
}
