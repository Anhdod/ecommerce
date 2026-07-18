package com.example.ecommerce.entity.order;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

import com.example.ecommerce.entity.product.Product;

@Entity
@Table(name = "order_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    private int quantity;

    private BigDecimal price;        // Giá tại thời điểm đặt hàng

    @Column(name = "cost_price")
    private BigDecimal costPrice;    // Giá vốn tại thời điểm đặt hàng

    private String selectedColor;

    public BigDecimal getSubtotal() {
        return price.multiply(BigDecimal.valueOf(quantity));
    }

    public BigDecimal getCostSubtotal() {
        BigDecimal snapshotCost = costPrice == null ? BigDecimal.ZERO : costPrice;
        return snapshotCost.multiply(BigDecimal.valueOf(quantity));
    }
}
