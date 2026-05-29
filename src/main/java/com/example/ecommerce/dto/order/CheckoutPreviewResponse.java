package com.example.ecommerce.dto.order;

import com.example.ecommerce.dto.cart.CartResponse;
import com.example.ecommerce.entity.order.ShippingMethod;
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
public class CheckoutPreviewResponse {

    private CartResponse cart;
    private ShippingMethod shippingMethod;
    private BigDecimal shippingFee;
    private BigDecimal subtotal;
    private BigDecimal grandTotal;
    private Long defaultShippingAddressId;
    private String defaultShippingAddress;
    private Long selectedShippingAddressId;
    private String selectedShippingAddress;
}
