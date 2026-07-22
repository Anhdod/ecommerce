package com.example.ecommerce.controller.auth;

import com.example.ecommerce.dto.ApiResponse;
import com.example.ecommerce.dto.auth.AuthRequest;
import com.example.ecommerce.dto.auth.AuthResponse;
import com.example.ecommerce.dto.auth.RefreshTokenRequest;
import com.example.ecommerce.dto.auth.ForgotPasswordRequest;
import com.example.ecommerce.dto.auth.PasswordResetChallengeResponse;
import com.example.ecommerce.dto.auth.ResetPasswordRequest;
import com.example.ecommerce.service.auth.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody AuthRequest request) {
        AuthResponse response = authService.register(request);
        if (response.isSuccess()) {
            return ResponseEntity.ok(ApiResponse.success("Dang ky thanh cong", response));
        }
        return ResponseEntity.badRequest().body(ApiResponse.error(response.getMessage()));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody AuthRequest request) {
        AuthResponse response = authService.login(request);
        if (response.isSuccess()) {
            return ResponseEntity.ok(ApiResponse.success("Dang nhap thanh cong", response));
        }
        return ResponseEntity.badRequest().body(ApiResponse.error(response.getMessage()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        AuthResponse response = authService.refreshAccessToken(request.getRefreshToken());
        if (response.isSuccess()) {
            return ResponseEntity.ok(ApiResponse.success("Lam moi token thanh cong", response));
        }
        return ResponseEntity.status(401).body(ApiResponse.error(response.getMessage()));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@Valid @RequestBody RefreshTokenRequest request) {
        boolean loggedOut = authService.logout(request.getRefreshToken());
        if (loggedOut) {
            return ResponseEntity.ok(ApiResponse.success("Dang xuat thanh cong", null));
        }
        return ResponseEntity.status(401).body(ApiResponse.error("Refresh token khong hop le"));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<PasswordResetChallengeResponse>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        PasswordResetChallengeResponse response = authService.requestPasswordReset(request);
        return ResponseEntity.ok(ApiResponse.success(
                "Mã đặt lại mật khẩu đã được gửi đến email của bạn.", response));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Đặt lại mật khẩu thành công", null));
    }
}
