package com.example.ecommerce.entity.cart;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

import com.example.ecommerce.entity.product.Product;
import com.example.ecommerce.entity.product.ProductVariant;

@Entity
@Table(name = "cart_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cart_id", nullable = false)
    private Cart cart;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_variant_id")
    private ProductVariant productVariant;

    private int quantity;

    private BigDecimal price;   // Giá tại thời điểm thêm vào giỏ

    private String selectedColor;

    // Tính thành tiền của item
    public BigDecimal getSubtotal() {
        return price.multiply(BigDecimal.valueOf(quantity));
    }
}
