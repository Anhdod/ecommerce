package com.example.ecommerce.dto.admin;

import lombok.*;

import java.io.Serializable;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TopSellingProductResponse implements Serializable {

    private Long productId;
    private String productName;
    private Long totalSold;
    private BigDecimal revenue;

    // Lombok @AllArgsConstructor provides the matching constructor used by JPQL
    // constructor expression
}
