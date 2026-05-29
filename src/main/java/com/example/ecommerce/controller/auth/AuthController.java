package com.example.ecommerce.controller.auth;

import com.example.ecommerce.dto.ApiResponse;
import com.example.ecommerce.dto.auth.AuthRequest;
import com.example.ecommerce.dto.auth.AuthResponse;
import com.example.ecommerce.service.auth.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody AuthRequest request) {
        AuthResponse response = authService.register(request);
        if (response.isSuccess()) {
            return ResponseEntity.ok(ApiResponse.success("Đăng ký thành công", response));
        }
        return ResponseEntity.badRequest().body(ApiResponse.error(response.getMessage()));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody AuthRequest request) {
        AuthResponse response = authService.login(request);
        if (response.isSuccess()) {
            return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công", response));
        }
        return ResponseEntity.badRequest().body(ApiResponse.error(response.getMessage()));
    }
}