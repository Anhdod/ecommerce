package com.example.ecommerce.controller.notification;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
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
    public ResponseEntity<ApiResponse<Page<NotificationResponse>>> getMyNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lay thong bao thanh cong",
                notificationService.getMyNotifications(page, size)));
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

    @DeleteMapping("/{notificationId}")
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(@PathVariable Long notificationId) {
        notificationService.deleteNotification(notificationId);
        return ResponseEntity.ok(ApiResponse.success("Da xoa thong bao", null));
    }

    @DeleteMapping("/read")
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<Integer>> clearReadNotifications() {
        int deleted = notificationService.clearReadNotifications();
        return ResponseEntity.ok(ApiResponse.success("Da xoa thong bao da doc", deleted));
    }
}
