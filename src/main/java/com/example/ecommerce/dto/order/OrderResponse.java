package com.example.ecommerce.dto.order;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
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
    private String shippingAddress;
    private String phoneNumber;
    private String trackingCode;
    private LocalDateTime createdAt;
}
