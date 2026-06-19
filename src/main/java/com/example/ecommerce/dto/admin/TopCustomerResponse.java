package com.example.ecommerce.dto.admin;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TopCustomerResponse {

    private Long userId;
    private String username;
    private String fullName;
    private Long totalOrders;
    private BigDecimal totalSpent;
}
