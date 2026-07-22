package com.example.ecommerce.dto.order;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;

import com.example.ecommerce.entity.order.OrderStatus;
import com.example.ecommerce.entity.order.ShippingMethod;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderResponse {

    private Long orderId;
    private Long userId;
    private List<OrderItemResponse> items;
    private BigDecimal subtotal;
    private BigDecimal discountAmount;
    private String couponCode;
    private BigDecimal totalPrice;
    private OrderStatus status;
    private ShippingMethod shippingMethod;
    private BigDecimal shippingFee;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private BigDecimal shippingCost;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private BigDecimal packagingCost;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private BigDecimal paymentFee;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private BigDecimal platformFee;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private BigDecimal refundAmount;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private BigDecimal costOfGoods;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private BigDecimal grossProfit;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private BigDecimal orderProfit;
    private String shippingAddress;
    private String phoneNumber;
    private String trackingCode;
    private String carrier;
    private LocalDate estimatedDeliveryDate;
    private LocalDateTime shippedAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime createdAt;
}
