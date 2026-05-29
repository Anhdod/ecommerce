package com.example.ecommerce.dto.order;

import com.example.ecommerce.entity.order.ShippingMethod;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderUpdateRequest {

    private String shippingAddress;
    private String phoneNumber;
    private ShippingMethod shippingMethod;
}
