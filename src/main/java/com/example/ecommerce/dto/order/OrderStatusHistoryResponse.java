package com.example.ecommerce.dto.order;

import com.example.ecommerce.entity.order.OrderStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderStatusHistoryResponse {

    private Long orderId;
    private OrderStatus oldStatus;
    private OrderStatus newStatus;
    private String changedBy;
    private String note;
    private LocalDateTime changedAt;
}
