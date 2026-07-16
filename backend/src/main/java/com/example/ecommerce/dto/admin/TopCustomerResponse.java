package com.example.ecommerce.dto.admin;

import lombok.*;

import java.io.Serializable;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TopCustomerResponse implements Serializable {

    private Long userId;
    private String username;
    private String fullName;
    private Long totalOrders;
    private BigDecimal totalSpent;
}
