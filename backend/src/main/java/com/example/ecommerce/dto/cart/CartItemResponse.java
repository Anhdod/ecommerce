package com.example.ecommerce.dto.cart;

import com.example.ecommerce.dto.products.ProductVariantResponse;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartItemResponse {

    private Long cartItemId;
    private Long productId;
    private String productName;
    private String imageUrl;
    private BigDecimal price;
    private int quantity;
    private String selectedColor;
    private Long variantId;
    private String variantName;
    private String sku;
    private Map<String, String> selectedAttributes;
    private List<ProductVariantResponse> availableVariants;
    private List<String> availableColors;
    private BigDecimal subtotal;
}
