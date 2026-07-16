package com.example.ecommerce.service.notification;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.ecommerce.dto.notification.NotificationResponse;
import com.example.ecommerce.entity.auth.User;
import com.example.ecommerce.entity.notification.Notification;
import com.example.ecommerce.entity.notification.NotificationType;
import com.example.ecommerce.repository.auth.UserRepository;
import com.example.ecommerce.repository.notification.NotificationRepository;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional
    public void createNotification(User user, NotificationType type, String title, String message, String linkUrl) {
        if (user == null) {
            return;
        }

        Notification notification = Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .message(message)
                .linkUrl(linkUrl)
                .build();
        notificationRepository.save(notification);
    }

    public List<NotificationResponse> getMyNotifications() {
        User user = getCurrentUser();
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public Page<NotificationResponse> getMyNotifications(int page, int size) {
        User user = getCurrentUser();
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(safePage, safeSize))
                .map(this::toResponse);
    }

    public long getUnreadCount() {
        User user = getCurrentUser();
        return notificationRepository.countByUserIdAndReadFalse(user.getId());
    }

    @Transactional
    public NotificationResponse markAsRead(Long notificationId) {
        User user = getCurrentUser();
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Khong tim thay thong bao"));
        if (!notification.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Khong co quyen");
        }
        notification.setRead(true);
        return toResponse(notificationRepository.save(notification));
    }

    @Transactional
    public void markAllAsRead() {
        User user = getCurrentUser();
        notificationRepository.markAllAsReadByUserId(user.getId());
    }

    @Transactional
    public void deleteNotification(Long notificationId) {
        User user = getCurrentUser();
        long deleted = notificationRepository.deleteByIdAndUserId(notificationId, user.getId());
        if (deleted == 0) {
            throw new RuntimeException("Khong tim thay thong bao");
        }
    }

    @Transactional
    public int clearReadNotifications() {
        User user = getCurrentUser();
        return notificationRepository.deleteReadByUserId(user.getId());
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Khong tim thay user"));
    }

    private NotificationResponse toResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .type(notification.getType())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .linkUrl(notification.getLinkUrl())
                .read(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
