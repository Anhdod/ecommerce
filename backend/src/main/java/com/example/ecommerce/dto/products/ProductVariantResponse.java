package com.example.ecommerce.dto.products;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.math.BigDecimal;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductVariantResponse {
    private Long id;
    private String sku;
    private String name;
    private Map<String, String> attributes;
    private BigDecimal price;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private BigDecimal costPrice;
    private int stockQuantity;
    private String imageUrl;
    private boolean active;
}
