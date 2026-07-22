package com.example.ecommerce.service.auth;

import com.example.ecommerce.dto.auth.AuthRequest;
import com.example.ecommerce.dto.auth.AuthResponse;
import com.example.ecommerce.dto.auth.ForgotPasswordRequest;
import com.example.ecommerce.dto.auth.ResetPasswordRequest;
import com.example.ecommerce.entity.auth.Role;
import com.example.ecommerce.entity.auth.User;
import com.example.ecommerce.repository.auth.UserRepository;
import com.example.ecommerce.security.jwt.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtUtil jwtUtil;
    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;
    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private AuthService authService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(5L)
                .username("shopper")
                .password("encoded-password")
                .email("shopper@example.com")
                .fullName("Shopper")
                .role(Role.USER)
                .enabled(true)
                .deleted(false)
                .build();
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        ReflectionTestUtils.setField(authService, "mailEnabled", false);
        ReflectionTestUtils.setField(authService, "exposeResetCode", true);
    }

    @Test
    void registerCreatesUserAndStoresRefreshToken() {
        AuthRequest request = registrationRequest();
        when(passwordEncoder.encode("secret123")).thenReturn("encoded-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtUtil.generateToken("shopper")).thenReturn("access-token");
        when(jwtUtil.generateRefreshToken("shopper")).thenReturn("refresh-token");

        AuthResponse response = authService.register(request);

        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getToken()).isEqualTo("access-token");
        assertThat(response.getRefreshToken()).isEqualTo("refresh-token");
        assertThat(response.getRole()).isEqualTo("USER");
        verify(valueOperations).set("auth:refresh:shopper", "refresh-token", Duration.ofDays(7));
    }

    @Test
    void registerRejectsDuplicateUsername() {
        AuthRequest request = registrationRequest();
        when(userRepository.existsByUsername("shopper")).thenReturn(true);

        AuthResponse response = authService.register(request);

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("Username");
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void loginReturnsTokensForValidCredentials() {
        AuthRequest request = AuthRequest.builder().username("shopper").password("secret123").build();
        when(userRepository.findByUsername("shopper")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret123", "encoded-password")).thenReturn(true);
        when(jwtUtil.generateToken("shopper")).thenReturn("access-token");
        when(jwtUtil.generateRefreshToken("shopper")).thenReturn("refresh-token");

        AuthResponse response = authService.login(request);

        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getUsername()).isEqualTo("shopper");
        verify(valueOperations).set("auth:refresh:shopper", "refresh-token", Duration.ofDays(7));
    }

    @Test
    void loginRejectsWrongPassword() {
        AuthRequest request = AuthRequest.builder().username("shopper").password("wrong-password").build();
        when(userRepository.findByUsername("shopper")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong-password", "encoded-password")).thenReturn(false);

        AuthResponse response = authService.login(request);

        assertThat(response.isSuccess()).isFalse();
        verify(jwtUtil, never()).generateToken(any());
    }

    @Test
    void refreshRejectsTokenThatDoesNotMatchRedis() {
        when(jwtUtil.validateToken("refresh-token")).thenReturn(true);
        when(jwtUtil.getUsernameFromToken("refresh-token")).thenReturn("shopper");
        when(valueOperations.get("auth:refresh:shopper")).thenReturn("another-token");

        AuthResponse response = authService.refreshAccessToken("refresh-token");

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("het hieu luc");
    }

    @Test
    void logoutDeletesValidRefreshToken() {
        when(jwtUtil.validateToken("refresh-token")).thenReturn(true);
        when(jwtUtil.getUsernameFromToken("refresh-token")).thenReturn("shopper");
        when(valueOperations.get("auth:refresh:shopper")).thenReturn("refresh-token");

        assertThat(authService.logout("refresh-token")).isTrue();

        verify(redisTemplate).delete("auth:refresh:shopper");
    }

    @Test
    void resetPasswordUpdatesPasswordAndRevokesRefreshToken() {
        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setEmail(" SHOPPER@example.com ");
        request.setCode("123456");
        request.setNewPassword("new-secret");
        request.setConfirmPassword("new-secret");
        when(userRepository.findByEmailIgnoreCase("shopper@example.com")).thenReturn(Optional.of(user));
        when(valueOperations.get("auth:password-reset:shopper@example.com")).thenReturn("encoded-code");
        when(passwordEncoder.matches("123456", "encoded-code")).thenReturn(true);
        when(passwordEncoder.encode("new-secret")).thenReturn("encoded-new-secret");

        authService.resetPassword(request);

        assertThat(user.getPassword()).isEqualTo("encoded-new-secret");
        verify(userRepository).save(user);
        verify(redisTemplate).delete("auth:password-reset:shopper@example.com");
        verify(redisTemplate).delete("auth:refresh:shopper");
    }

    @Test
    void forgotPasswordRejectsUnknownEmail() {
        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail("missing@example.com");
        when(userRepository.findByEmailIgnoreCase("missing@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.requestPasswordReset(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("không tồn tại");
    }

    private AuthRequest registrationRequest() {
        return AuthRequest.builder()
                .username("shopper")
                .password("secret123")
                .email("shopper@example.com")
                .fullName("Shopper")
                .phoneNumber("0900000000")
                .build();
    }
}
