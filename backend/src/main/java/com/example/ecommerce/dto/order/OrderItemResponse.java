package com.example.ecommerce.dto.order;

import lombok.*;
import java.math.BigDecimal;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItemResponse {

    private Long orderItemId;
    private Long productId;
    private String productName;
    private String imageUrl;
    private BigDecimal price;
    private int quantity;
    private String selectedColor;
    private Long variantId;
    private String variantSku;
    private String variantName;
    private Map<String, String> selectedAttributes;
    private BigDecimal subtotal;
}
