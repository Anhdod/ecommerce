package com.example.ecommerce.dto.admin;

import com.example.ecommerce.entity.order.OrderStatus;
import lombok.*;

import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderStatusStatResponse implements Serializable {

    private OrderStatus status;
    private long total;
}
