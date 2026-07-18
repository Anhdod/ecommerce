package com.example.ecommerce.service.auth;

import com.example.ecommerce.dto.auth.AuthRequest;
import com.example.ecommerce.dto.auth.AuthResponse;
import com.example.ecommerce.entity.auth.Role;
import com.example.ecommerce.entity.auth.User;
import com.example.ecommerce.repository.auth.UserRepository;
import com.example.ecommerce.security.jwt.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class AuthService {

    private static final Duration REFRESH_TOKEN_TTL = Duration.ofDays(7);
    private static final String REFRESH_TOKEN_KEY_PREFIX = "auth:refresh:";

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private StringRedisTemplate redisTemplate;

    public AuthResponse register(AuthRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            return AuthResponse.builder()
                    .success(false)
                    .message("Username da ton tai")
                    .build();
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            return AuthResponse.builder()
                    .success(false)
                    .message("Email da ton tai")
                    .build();
        }

        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .email(request.getEmail())
                .fullName(request.getFullName())
                .phoneNumber(request.getPhoneNumber())
                .role(Role.USER)
                .enabled(true)
                .build();

        userRepository.save(user);

        return buildSuccessfulAuthResponse(user, "Dang ky thanh cong");
    }

    public AuthResponse login(AuthRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElse(null);

        if (user == null || user.isDeleted() || !user.isEnabled()
                || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return AuthResponse.builder()
                    .success(false)
                    .message("Username hoac mat khau khong dung")
                    .build();
        }

        return buildSuccessfulAuthResponse(user, "Dang nhap thanh cong");
    }

    public AuthResponse refreshAccessToken(String refreshToken) {
        if (refreshToken == null || !jwtUtil.validateToken(refreshToken)) {
            return AuthResponse.builder()
                    .success(false)
                    .message("Refresh token khong hop le")
                    .build();
        }

        String username = jwtUtil.getUsernameFromToken(refreshToken);
        String storedToken = redisTemplate.opsForValue().get(refreshTokenKey(username));

        if (!refreshToken.equals(storedToken)) {
            return AuthResponse.builder()
                    .success(false)
                    .message("Refresh token da het hieu luc")
                    .build();
        }

        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null || user.isDeleted() || !user.isEnabled()) {
            return AuthResponse.builder()
                    .success(false)
                    .message("Tai khoan khong hop le")
                    .build();
        }

        return AuthResponse.builder()
                .success(true)
                .message("Lam moi token thanh cong")
                .token(jwtUtil.generateToken(username))
                .refreshToken(refreshToken)
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .build();
    }

    public boolean logout(String refreshToken) {
        if (refreshToken == null || !jwtUtil.validateToken(refreshToken)) {
            return false;
        }

        String username = jwtUtil.getUsernameFromToken(refreshToken);
        String key = refreshTokenKey(username);
        String storedToken = redisTemplate.opsForValue().get(key);

        if (!refreshToken.equals(storedToken)) {
            return false;
        }

        redisTemplate.delete(key);
        return true;
    }

    private AuthResponse buildSuccessfulAuthResponse(User user, String message) {
        String token = jwtUtil.generateToken(user.getUsername());
        String refreshToken = jwtUtil.generateRefreshToken(user.getUsername());
        redisTemplate.opsForValue().set(refreshTokenKey(user.getUsername()), refreshToken, REFRESH_TOKEN_TTL);

        return AuthResponse.builder()
                .success(true)
                .message(message)
                .token(token)
                .refreshToken(refreshToken)
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .build();
    }

    private String refreshTokenKey(String username) {
        return REFRESH_TOKEN_KEY_PREFIX + username;
    }
}
