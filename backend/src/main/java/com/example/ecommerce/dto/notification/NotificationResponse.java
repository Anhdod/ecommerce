package com.example.ecommerce.dto.notification;

import java.time.LocalDateTime;

import com.example.ecommerce.entity.notification.NotificationType;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationResponse {
    private Long id;
    private NotificationType type;
    private String title;
    private String message;
    private String linkUrl;
    private boolean read;
    private LocalDateTime createdAt;
}
