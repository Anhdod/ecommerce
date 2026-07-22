package com.example.ecommerce.service.auth;

import com.example.ecommerce.dto.auth.AuthRequest;
import com.example.ecommerce.dto.auth.AuthResponse;
import com.example.ecommerce.dto.auth.ForgotPasswordRequest;
import com.example.ecommerce.dto.auth.PasswordResetChallengeResponse;
import com.example.ecommerce.dto.auth.ResetPasswordRequest;
import com.example.ecommerce.entity.auth.Role;
import com.example.ecommerce.entity.auth.User;
import com.example.ecommerce.repository.auth.UserRepository;
import com.example.ecommerce.security.jwt.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.security.SecureRandom;
import java.util.Locale;

@Service
public class AuthService {

    private static final Duration REFRESH_TOKEN_TTL = Duration.ofDays(7);
    private static final String REFRESH_TOKEN_KEY_PREFIX = "auth:refresh:";
    private static final Duration PASSWORD_RESET_TTL = Duration.ofMinutes(10);
    private static final String PASSWORD_RESET_KEY_PREFIX = "auth:password-reset:";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Autowired
    private JavaMailSender mailSender;

    @Value("${app.mail.enabled:false}")
    private boolean mailEnabled;

    @Value("${app.password-reset.expose-code:true}")
    private boolean exposeResetCode;

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

    public PasswordResetChallengeResponse requestPasswordReset(ForgotPasswordRequest request) {
        String email = normalizeEmail(request.getEmail());
        User user = userRepository.findByEmailIgnoreCase(email)
                .filter(existing -> existing.isEnabled() && !existing.isDeleted())
                .orElseThrow(() -> new RuntimeException("Email không tồn tại hoặc chưa đăng ký tài khoản"));

        String resetCode = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
        redisTemplate.opsForValue().set(
                passwordResetKey(email),
                passwordEncoder.encode(resetCode),
                PASSWORD_RESET_TTL);
        if (mailEnabled) {
            sendPasswordResetEmail(user, resetCode);
        }

        return PasswordResetChallengeResponse.builder()
                .expiresInMinutes((int) PASSWORD_RESET_TTL.toMinutes())
                .demoCode(exposeResetCode ? resetCode : null)
                .build();
    }

    public void resetPassword(ResetPasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("Mật khẩu xác nhận không khớp");
        }

        String email = normalizeEmail(request.getEmail());
        User user = userRepository.findByEmailIgnoreCase(email)
                .filter(existing -> existing.isEnabled() && !existing.isDeleted())
                .orElseThrow(() -> new RuntimeException("Mã xác nhận không hợp lệ hoặc đã hết hạn"));
        String key = passwordResetKey(email);
        String storedCode = redisTemplate.opsForValue().get(key);

        if (storedCode == null || !passwordEncoder.matches(request.getCode(), storedCode)) {
            throw new RuntimeException("Mã xác nhận không hợp lệ hoặc đã hết hạn");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        redisTemplate.delete(key);
        redisTemplate.delete(refreshTokenKey(user.getUsername()));
    }

    private void sendPasswordResetEmail(User user, String resetCode) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(user.getEmail());
            message.setSubject("ShopZone - Mã đặt lại mật khẩu");
            message.setText("Xin chào " + (user.getFullName() != null ? user.getFullName() : user.getUsername())
                    + ",\n\nMã đặt lại mật khẩu của bạn là: " + resetCode
                    + "\nMã có hiệu lực trong 10 phút. Không chia sẻ mã này với bất kỳ ai.");
            mailSender.send(message);
        } catch (RuntimeException exception) {
            redisTemplate.delete(passwordResetKey(normalizeEmail(user.getEmail())));
            throw new RuntimeException("Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.");
        }
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

    private String passwordResetKey(String email) {
        return PASSWORD_RESET_KEY_PREFIX + email;
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
