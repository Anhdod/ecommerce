package com.example.ecommerce.dto.coupon;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CouponPreviewResponse {

    private String code;
    private BigDecimal subtotal;
    private BigDecimal discountAmount;
    private BigDecimal totalAfterDiscount;
}
