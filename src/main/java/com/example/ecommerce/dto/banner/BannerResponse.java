package com.example.ecommerce.dto.banner;

import java.time.LocalDateTime;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BannerResponse {
    private Long id;
    private String title;
    private String subtitle;
    private String imageUrl;
    private String linkUrl;
    private boolean active;
    private Integer sortOrder;
    private LocalDateTime createdAt;
}
