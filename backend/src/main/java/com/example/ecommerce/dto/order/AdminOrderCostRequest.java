package com.example.ecommerce.dto.order;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminOrderCostRequest {

    @NotNull
    @PositiveOrZero
    private BigDecimal shippingCost;

    @NotNull
    @PositiveOrZero
    private BigDecimal packagingCost;

    @NotNull
    @PositiveOrZero
    private BigDecimal paymentFee;

    @NotNull
    @PositiveOrZero
    private BigDecimal platformFee;

    @NotNull
    @PositiveOrZero
    private BigDecimal refundAmount;
}
