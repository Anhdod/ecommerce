package com.example.ecommerce.dto.admin;

import lombok.*;

import java.io.Serializable;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminDashboardResponse implements Serializable {

    private long totalOrders;
    private long pendingOrders;
    private long confirmedOrders;
    private long shippingOrders;
    private long deliveredOrders;
    private long cancelledOrders;
    private BigDecimal totalRevenue;
    private BigDecimal totalCost;
    private BigDecimal totalGrossProfit;
    private BigDecimal totalOrderProfit;
    private BigDecimal totalOperatingExpense;
    private BigDecimal totalProfit;
    private BigDecimal profitMargin;
    private long totalPaidPayments;
    private long totalPendingPayments;
    private long totalProducts;
    private long totalCustomers;
    private java.util.List<com.example.ecommerce.dto.admin.TopSellingProductResponse> topSellingProducts;
}
