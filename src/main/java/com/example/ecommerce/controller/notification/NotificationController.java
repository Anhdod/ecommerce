package com.example.ecommerce.controller.notification;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.example.ecommerce.dto.ApiResponse;
import com.example.ecommerce.dto.notification.NotificationResponse;
import com.example.ecommerce.service.notification.NotificationService;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @GetMapping
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getMyNotifications() {
        return ResponseEntity.ok(ApiResponse.success("Lay thong bao thanh cong", notificationService.getMyNotifications()));
    }

    @GetMapping("/unread-count")
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount() {
        return ResponseEntity.ok(ApiResponse.success("Lay so thong bao chua doc thanh cong", notificationService.getUnreadCount()));
    }

    @PutMapping("/{notificationId}/read")
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<NotificationResponse>> markAsRead(@PathVariable Long notificationId) {
        return ResponseEntity.ok(ApiResponse.success("Da danh dau da doc", notificationService.markAsRead(notificationId)));
    }

    @PutMapping("/read-all")
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead() {
        notificationService.markAllAsRead();
        return ResponseEntity.ok(ApiResponse.success("Da danh dau tat ca da doc", null));
    }
}
