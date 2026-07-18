package com.example.ecommerce.entity.order;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.example.ecommerce.entity.auth.User;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private OrderStatus status = OrderStatus.PENDING;

    private BigDecimal totalPrice;

    @Builder.Default
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    private String couponCode;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ShippingMethod shippingMethod = ShippingMethod.STANDARD;

    @Builder.Default
    private BigDecimal shippingFee = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal shippingCost = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal packagingCost = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal paymentFee = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal platformFee = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal refundAmount = BigDecimal.ZERO;

    private String shippingAddress;
    private String phoneNumber;
    private String trackingCode;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Tính tổng tiền đơn hàng
    public BigDecimal calculateTotalPrice() {
        return items.stream()
                .map(OrderItem::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public BigDecimal calculateCostOfGoods() {
        return items.stream()
                .map(OrderItem::getCostSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public BigDecimal calculateNetRevenue() {
        return zeroIfNull(totalPrice).subtract(zeroIfNull(refundAmount));
    }

    public BigDecimal calculateGrossProfit() {
        BigDecimal productRevenue = calculateNetRevenue().subtract(zeroIfNull(shippingFee));
        return productRevenue.subtract(calculateCostOfGoods());
    }

    public BigDecimal calculateOrderProfit() {
        return calculateNetRevenue()
                .subtract(calculateCostOfGoods())
                .subtract(zeroIfNull(shippingCost))
                .subtract(zeroIfNull(packagingCost))
                .subtract(zeroIfNull(paymentFee))
                .subtract(zeroIfNull(platformFee));
    }

    private BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
