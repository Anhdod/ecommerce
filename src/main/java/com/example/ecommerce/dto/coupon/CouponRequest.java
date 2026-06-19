package com.example.ecommerce.dto.coupon;

import com.example.ecommerce.entity.coupon.DiscountType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CouponRequest {

    @NotBlank
    private String code;

    private String description;

    @NotNull
    private DiscountType discountType;

    @NotNull
    @Positive
    private BigDecimal discountValue;

    @PositiveOrZero
    private BigDecimal minOrderAmount;

    @PositiveOrZero
    private BigDecimal maxDiscountAmount;

    @Positive
    private Integer usageLimit;

    private Boolean active;

    private LocalDateTime expiresAt;
}
