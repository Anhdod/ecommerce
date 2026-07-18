package com.example.ecommerce.service.auth;

import com.example.ecommerce.dto.auth.UserProfileResponse;
import com.example.ecommerce.dto.auth.UserUpdateRequest;
import com.example.ecommerce.dto.auth.AdminUserCreateRequest;
import com.example.ecommerce.dto.auth.AdminUserUpdateRequest;
import com.example.ecommerce.entity.auth.Role;
import com.example.ecommerce.entity.auth.User;
import com.example.ecommerce.repository.auth.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public UserProfileResponse getCurrentUserProfile() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        return convertToResponse(user);
    }

    @Transactional
    public UserProfileResponse updateCurrentUserProfile(UserUpdateRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        if (request.getFullName() != null) {
            user.setFullName(request.getFullName());
        }
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber());
        }
        if (request.getAddress() != null) {
            user.setAddress(request.getAddress());
        }

        User updated = userRepository.save(user);
        return convertToResponse(updated);
    }

    public List<UserProfileResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .filter(user -> !user.isDeleted())
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public UserProfileResponse createUser(AdminUserCreateRequest request) {
        String username = request.getUsername().trim();
        String email = request.getEmail().trim();
        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Username da ton tai");
        }
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email da ton tai");
        }

        User created = User.builder()
                .username(username)
                .password(passwordEncoder.encode(request.getPassword()))
                .email(email)
                .fullName(trimToNull(request.getFullName()))
                .phoneNumber(trimToNull(request.getPhoneNumber()))
                .address(trimToNull(request.getAddress()))
                .role(request.getRole() != null ? request.getRole() : Role.USER)
                .enabled(request.getEnabled() == null || request.getEnabled())
                .deleted(false)
                .build();
        return convertToResponse(userRepository.save(created));
    }

    public UserProfileResponse getUserById(Long userId) {
        User user = getActiveUser(userId);
        return convertToResponse(user);
    }

    @Transactional
    public UserProfileResponse updateUserByAdmin(Long userId, AdminUserUpdateRequest request) {
        User user = getActiveUser(userId);

        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            userRepository.findByEmail(request.getEmail())
                    .filter(existing -> !existing.getId().equals(userId))
                    .ifPresent(existing -> {
                        throw new RuntimeException("Email da ton tai");
                    });
            user.setEmail(request.getEmail());
        }
        if (request.getFullName() != null) {
            user.setFullName(request.getFullName());
        }
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber());
        }
        if (request.getAddress() != null) {
            user.setAddress(request.getAddress());
        }
        if (request.getRole() != null) {
            preventSelfRoleChange(user, request.getRole());
            user.setRole(request.getRole());
        }
        if (request.getEnabled() != null) {
            preventSelfDisable(user, request.getEnabled());
            user.setEnabled(request.getEnabled());
        }

        return convertToResponse(userRepository.save(user));
    }

    @Transactional
    public UserProfileResponse updateUserRole(Long userId, Role role) {
        User user = getActiveUser(userId);
        preventSelfRoleChange(user, role);
        user.setRole(role);
        return convertToResponse(userRepository.save(user));
    }

    @Transactional
    public UserProfileResponse setUserEnabled(Long userId, boolean enabled) {
        User user = getActiveUser(userId);
        preventSelfDisable(user, enabled);
        user.setEnabled(enabled);
        return convertToResponse(userRepository.save(user));
    }

    @Transactional
    public void deleteUser(Long userId) {
        User user = getActiveUser(userId);
        preventSelfDisable(user, false);
        user.setEnabled(false);
        user.setDeleted(true);
        userRepository.save(user);
    }

    private User getActiveUser(Long userId) {
        return userRepository.findById(userId)
                .filter(user -> !user.isDeleted())
                .orElseThrow(() -> new RuntimeException("Khong tim thay nguoi dung"));
    }

    private String trimToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }

    private void preventSelfDisable(User targetUser, boolean enabled) {
        if (enabled) {
            return;
        }

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        if (targetUser.getUsername().equals(currentUsername)) {
            throw new RuntimeException("Khong the khoa tai khoan dang dang nhap");
        }
    }

    private void preventSelfRoleChange(User targetUser, Role role) {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        if (targetUser.getUsername().equals(currentUsername) && role != targetUser.getRole()) {
            throw new RuntimeException("Khong the tu thay doi quyen tai khoan dang dang nhap");
        }
    }

    private UserProfileResponse convertToResponse(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phoneNumber(user.getPhoneNumber())
                .address(user.getAddress())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .enabled(user.isEnabled())
                .build();
    }
}
