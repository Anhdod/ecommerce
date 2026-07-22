package com.example.ecommerce.entity.product;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Entity
@Table(name = "product_variants", uniqueConstraints = @UniqueConstraint(name = "uk_product_variant_sku", columnNames = "sku"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductVariant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false, length = 100)
    private String sku;

    @Column(nullable = false, length = 160)
    private String name;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "product_variant_attributes", joinColumns = @JoinColumn(name = "variant_id"))
    @MapKeyColumn(name = "attribute_name", length = 60)
    @Column(name = "attribute_value", nullable = false, length = 120)
    @Builder.Default
    private Map<String, String> attributes = new LinkedHashMap<>();

    @Column(nullable = false)
    private BigDecimal price;

    @Column(name = "cost_price", nullable = false)
    private BigDecimal costPrice;

    @Column(name = "stock_quantity", nullable = false)
    private int stockQuantity;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Builder.Default
    private boolean active = true;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
