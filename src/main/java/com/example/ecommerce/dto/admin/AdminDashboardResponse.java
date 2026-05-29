package com.example.ecommerce.dto.admin;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminDashboardResponse {

    private long totalOrders;
    private long pendingOrders;
    private long confirmedOrders;
    private long shippingOrders;
    private long deliveredOrders;
    private long cancelledOrders;
    private BigDecimal totalRevenue;
    private long totalPaidPayments;
    private long totalPendingPayments;
    private long totalProducts;
    private long totalCustomers;
    private java.util.List<com.example.ecommerce.dto.admin.TopSellingProductResponse> topSellingProducts;
}
