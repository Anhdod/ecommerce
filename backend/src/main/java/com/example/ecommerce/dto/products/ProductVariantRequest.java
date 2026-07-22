package com.example.ecommerce.dto.products;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductVariantRequest {
    private Long id;

    @NotBlank(message = "SKU không được để trống")
    @Size(max = 100, message = "SKU tối đa 100 ký tự")
    private String sku;

    @Size(max = 160, message = "Tên biến thể tối đa 160 ký tự")
    private String name;

    private Map<@Size(max = 60) String, @Size(max = 120) String> attributes;

    @NotNull(message = "Giá biến thể không được để trống")
    @Positive(message = "Giá biến thể phải lớn hơn 0")
    private BigDecimal price;

    @NotNull(message = "Giá vốn biến thể không được để trống")
    @PositiveOrZero(message = "Giá vốn biến thể không được âm")
    private BigDecimal costPrice;

    @Min(value = 0, message = "Tồn kho biến thể không được âm")
    private int stockQuantity;

    @Size(max = 500, message = "URL ảnh biến thể tối đa 500 ký tự")
    private String imageUrl;

    private Boolean active;
}
