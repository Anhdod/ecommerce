package com.example.ecommerce.dto.products;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductResponse {

    private Long id;
    private String name;
    private String description;
    private BigDecimal price;
    private int stockQuantity;
    private String imageUrl;
    private Long categoryId;
    private String categoryName;
    private boolean active;
    private boolean featured;
    private LocalDateTime createdAt;
    private long likeCount;
    private int reviewCount;
    private double averageRating;   
    private boolean isLikedByCurrentUser;
    private long salesCount;
}
