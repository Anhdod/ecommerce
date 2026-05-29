package com.example.ecommerce.controller.auth;

import com.example.ecommerce.dto.ApiResponse;
import com.example.ecommerce.dto.auth.UserProfileResponse;
import com.example.ecommerce.dto.auth.UserUpdateRequest;
import com.example.ecommerce.service.auth.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getMyProfile() {
        UserProfileResponse profile = userService.getCurrentUserProfile();
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin người dùng thành công", profile));
    }

    @PutMapping("/me")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateMyProfile(
            @Valid @RequestBody UserUpdateRequest request) {
        UserProfileResponse profile = userService.updateCurrentUserProfile(request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin người dùng thành công", profile));
    }
}
