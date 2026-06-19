package com.example.ecommerce.dto.admin;

import com.example.ecommerce.entity.order.OrderStatus;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderStatusStatResponse {

    private OrderStatus status;
    private long total;
}
