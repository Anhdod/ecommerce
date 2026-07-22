package com.example.ecommerce.dto.products;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

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
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private BigDecimal costPrice;
    private int stockQuantity;
    private String imageUrl;
    private List<String> imageUrls;
    private String brand;
    private Integer warrantyMonths;
    private List<String> colors;
    private List<ProductVariantResponse> variants;
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
