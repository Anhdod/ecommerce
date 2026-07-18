package com.example.ecommerce.dto.products;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

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

    @Size(max = 100, message = "Thương hiệu tối đa 100 ký tự")
    private String brand;

    @Min(value = 0, message = "Thời gian bảo hành không được âm")
    private Integer warrantyMonths;

    private List<@Size(max = 50, message = "Tên màu tối đa 50 ký tự") String> colors;

    private Boolean featured;
}
