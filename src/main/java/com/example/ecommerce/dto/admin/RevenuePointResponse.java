package com.example.ecommerce.dto.admin;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RevenuePointResponse {

    private String period;
    private BigDecimal revenue;
    private long paymentCount;
}
