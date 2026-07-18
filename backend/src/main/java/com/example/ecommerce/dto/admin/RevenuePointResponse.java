package com.example.ecommerce.dto.admin;

import lombok.*;

import java.io.Serializable;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RevenuePointResponse implements Serializable {

    private String period;
    private BigDecimal revenue;
    private BigDecimal cost;
    private BigDecimal grossProfit;
    private BigDecimal orderProfit;
    private BigDecimal operatingExpense;
    private BigDecimal profit;
    private long paymentCount;
}
