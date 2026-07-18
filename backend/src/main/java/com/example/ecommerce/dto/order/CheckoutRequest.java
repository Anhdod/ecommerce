package com.example.ecommerce.dto.order;

import com.example.ecommerce.entity.order.ShippingMethod;
import com.example.ecommerce.entity.payment.PaymentMethod;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckoutRequest {

    private Long addressId;
    private String shippingAddress;
    private String phoneNumber;

    @NotNull
    private PaymentMethod paymentMethod;

    private ShippingMethod shippingMethod;
    private String couponCode;
    private List<Long> cartItemIds;
}
