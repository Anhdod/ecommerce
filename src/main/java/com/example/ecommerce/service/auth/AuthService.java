package com.example.ecommerce.service.auth;

import com.example.ecommerce.dto.auth.AuthRequest;
import com.example.ecommerce.dto.auth.AuthResponse;
import com.example.ecommerce.entity.auth.Role;
import com.example.ecommerce.entity.auth.User;
import com.example.ecommerce.repository.auth.UserRepository;
import com.example.ecommerce.security.jwt.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    // Đăng ký
    public AuthResponse register(AuthRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            return AuthResponse.builder()
                    .success(false)
                    .message("Username đã tồn tại")
                    .build();
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            return AuthResponse.builder()
                    .success(false)
                    .message("Email đã tồn tại")
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

        String token = jwtUtil.generateToken(user.getUsername());

        return AuthResponse.builder()
                .success(true)
                .message("Đăng ký thành công")
                .token(token)
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .build();
    }

    // Đăng nhập
    public AuthResponse login(AuthRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElse(null);

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return AuthResponse.builder()
                    .success(false)
                    .message("Username hoặc mật khẩu không đúng")
                    .build();
        }

        String token = jwtUtil.generateToken(user.getUsername());

        return AuthResponse.builder()
                .success(true)
                .message("Đăng nhập thành công")
                .token(token)
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .build();
    }
}