package com.example.ecommerce.dto.products;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductReviewResponse {

    private Long id;
    private Long productId;
    private String username;
    private String fullName;
    private int rating;
    private String comment;
    private String imageUrl;
    private boolean hidden;
    private LocalDateTime createdAt;
}
