package com.equipgrid.auth.service;

import com.equipgrid.auth.dto.request.LoginRequest;
import com.equipgrid.auth.dto.request.RegisterRequest;
import com.equipgrid.auth.dto.response.AuthResponse;

public interface IAuthService {
    AuthResponse login(LoginRequest request);
    AuthResponse register(RegisterRequest request);
}
