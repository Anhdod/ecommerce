package com.example.ecommerce.dto.admin;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TopSellingProductResponse {

    private Long productId;
    private String productName;
    private Long totalSold;
    private BigDecimal revenue;

    // Lombok @AllArgsConstructor provides the matching constructor used by JPQL
    // constructor expression
}
