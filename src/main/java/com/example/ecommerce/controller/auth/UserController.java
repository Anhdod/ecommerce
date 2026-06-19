package com.example.ecommerce.controller.auth;

import com.example.ecommerce.dto.ApiResponse;
import com.example.ecommerce.dto.auth.AdminUserUpdateRequest;
import com.example.ecommerce.dto.auth.UserProfileResponse;
import com.example.ecommerce.dto.auth.UserUpdateRequest;
import com.example.ecommerce.entity.auth.Role;
import com.example.ecommerce.service.auth.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getMyProfile() {
        UserProfileResponse profile = userService.getCurrentUserProfile();
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin người dùng thành công", profile));
    }

    @PutMapping("/me")
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateMyProfile(
            @Valid @RequestBody UserUpdateRequest request) {
        UserProfileResponse profile = userService.updateCurrentUserProfile(request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin người dùng thành công", profile));
    }
    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<UserProfileResponse>>> getAllUsers() {
        return ResponseEntity.ok(ApiResponse.success("Lay danh sach user thanh cong", userService.getAllUsers()));
    }

    @GetMapping("/admin/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getUserById(@PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.success("Lay user thanh cong", userService.getUserById(userId)));
    }

    @PutMapping("/admin/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateUserByAdmin(
            @PathVariable Long userId,
            @Valid @RequestBody AdminUserUpdateRequest request) {
        return ResponseEntity.ok(
                ApiResponse.success("Cap nhat user thanh cong", userService.updateUserByAdmin(userId, request)));
    }

    @PutMapping("/admin/{userId}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateUserRole(
            @PathVariable Long userId,
            @RequestParam Role role) {
        return ResponseEntity.ok(ApiResponse.success("Cap nhat role thanh cong", userService.updateUserRole(userId, role)));
    }

    @PutMapping("/admin/{userId}/enabled")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserProfileResponse>> setUserEnabled(
            @PathVariable Long userId,
            @RequestParam boolean enabled) {
        return ResponseEntity.ok(
                ApiResponse.success("Cap nhat trang thai user thanh cong", userService.setUserEnabled(userId, enabled)));
    }

    @DeleteMapping("/admin/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> disableUser(@PathVariable Long userId) {
        userService.disableUser(userId);
        return ResponseEntity.ok(ApiResponse.success("Da khoa user thanh cong", null));
    }
}

