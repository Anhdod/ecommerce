package com.example.ecommerce.service.auth;

import com.example.ecommerce.dto.auth.UserProfileResponse;
import com.example.ecommerce.dto.auth.UserUpdateRequest;
import com.example.ecommerce.dto.auth.AdminUserUpdateRequest;
import com.example.ecommerce.entity.auth.Role;
import com.example.ecommerce.entity.auth.User;
import com.example.ecommerce.repository.auth.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

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
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    public UserProfileResponse getUserById(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Khong tim thay nguoi dung"));
        return convertToResponse(user);
    }

    @Transactional
    public UserProfileResponse updateUserByAdmin(Long userId, AdminUserUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Khong tim thay nguoi dung"));

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
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Khong tim thay nguoi dung"));
        user.setRole(role);
        return convertToResponse(userRepository.save(user));
    }

    @Transactional
    public UserProfileResponse setUserEnabled(Long userId, boolean enabled) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Khong tim thay nguoi dung"));
        preventSelfDisable(user, enabled);
        user.setEnabled(enabled);
        return convertToResponse(userRepository.save(user));
    }

    @Transactional
    public void disableUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Khong tim thay nguoi dung"));
        preventSelfDisable(user, false);
        user.setEnabled(false);
        userRepository.save(user);
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
