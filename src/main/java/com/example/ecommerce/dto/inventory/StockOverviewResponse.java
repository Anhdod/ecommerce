package com.example.ecommerce.dto.inventory;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockOverviewResponse {
    private Long productId;
    private String productName;
    private String categoryName;
    private int stockQuantity;
    private BigDecimal price;
    private String imageUrl;
}
