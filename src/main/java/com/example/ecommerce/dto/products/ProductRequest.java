package com.example.ecommerce.dto.products;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductRequest {

    @NotBlank(message = "Tên sản phẩm không được để trống")
    @Size(min = 3, max = 255, message = "Tên sản phẩm phải từ 3-255 ký tự")
    private String name;

    private String description;

    @NotNull(message = "Giá không được để trống")
    @Positive(message = "Giá phải lớn hơn 0")
    private BigDecimal price;

    @Min(value = 0, message = "Số lượng tồn kho không được âm")
    private int stockQuantity;

    private Long categoryId;

    private String imageUrl;
}