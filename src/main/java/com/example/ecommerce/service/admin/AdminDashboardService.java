package com.example.ecommerce.service.admin;

import com.example.ecommerce.dto.admin.AdminDashboardResponse;
import com.example.ecommerce.dto.admin.OrderStatusStatResponse;
import com.example.ecommerce.dto.admin.RevenuePointResponse;
import com.example.ecommerce.dto.admin.TopCustomerResponse;
import com.example.ecommerce.entity.order.OrderStatus;
import com.example.ecommerce.entity.payment.PaymentStatus;
import com.example.ecommerce.repository.order.OrderRepository;
import com.example.ecommerce.repository.payment.PaymentRepository;
import com.example.ecommerce.repository.products.ProductRepository;
import com.example.ecommerce.repository.auth.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@Service
public class AdminDashboardService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.example.ecommerce.repository.order.OrderItemRepository orderItemRepository;

    public AdminDashboardResponse getDashboardSummary() {
        BigDecimal totalRevenue = paymentRepository.findByStatus(PaymentStatus.PAID).stream()
                .map(payment -> payment.getAmount() == null ? BigDecimal.ZERO : payment.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long totalPaidPayments = paymentRepository.findByStatus(PaymentStatus.PAID).size();
        long totalPendingPayments = paymentRepository.findByStatus(PaymentStatus.PENDING).size();

        java.util.List<com.example.ecommerce.dto.admin.TopSellingProductResponse> topSelling = orderItemRepository
                .findTopSellingProducts(org.springframework.data.domain.PageRequest.of(0, 5));

        return AdminDashboardResponse.builder()
                .totalOrders(orderRepository.count())
                .pendingOrders(orderRepository.countByStatus(OrderStatus.PENDING))
                .confirmedOrders(orderRepository.countByStatus(OrderStatus.CONFIRMED))
                .shippingOrders(orderRepository.countByStatus(OrderStatus.SHIPPING))
                .deliveredOrders(orderRepository.countByStatus(OrderStatus.DELIVERED))
                .cancelledOrders(orderRepository.countByStatus(OrderStatus.CANCELLED))
                .totalRevenue(totalRevenue)
                .totalPaidPayments(totalPaidPayments)
                .totalPendingPayments(totalPendingPayments)
                .totalProducts(productRepository.count())
                .totalCustomers(userRepository.count())
                .topSellingProducts(topSelling)
                .build();
    }

    public java.util.List<com.example.ecommerce.dto.admin.TopSellingProductResponse> getTopSelling(int limit) {
        if (limit <= 0)
            limit = 5;
        return orderItemRepository
                .findTopSellingProducts(org.springframework.data.domain.PageRequest.of(0, Math.min(limit, 100)));
    }

    public List<RevenuePointResponse> getRevenueTimeline(String groupBy, LocalDate from, LocalDate to) {
        boolean monthly = "month".equalsIgnoreCase(groupBy);
        DateTimeFormatter formatter = monthly ? DateTimeFormatter.ofPattern("yyyy-MM") : DateTimeFormatter.ISO_DATE;
        Map<String, RevenueAccumulator> grouped = new TreeMap<>();

        paymentRepository.findByStatus(PaymentStatus.PAID).stream()
                .filter(payment -> payment.getPaymentDate() != null)
                .filter(payment -> from == null || !payment.getPaymentDate().toLocalDate().isBefore(from))
                .filter(payment -> to == null || !payment.getPaymentDate().toLocalDate().isAfter(to))
                .forEach(payment -> {
                    String period = monthly
                            ? YearMonth.from(payment.getPaymentDate()).format(formatter)
                            : payment.getPaymentDate().toLocalDate().format(formatter);
                    RevenueAccumulator accumulator = grouped.computeIfAbsent(period, key -> new RevenueAccumulator());
                    accumulator.revenue = accumulator.revenue
                            .add(payment.getAmount() == null ? BigDecimal.ZERO : payment.getAmount());
                    accumulator.paymentCount++;
                });

        return grouped.entrySet().stream()
                .map(entry -> RevenuePointResponse.builder()
                        .period(entry.getKey())
                        .revenue(entry.getValue().revenue)
                        .paymentCount(entry.getValue().paymentCount)
                        .build())
                .toList();
    }

    public List<OrderStatusStatResponse> getOrderStatusStats() {
        return java.util.Arrays.stream(OrderStatus.values())
                .map(status -> OrderStatusStatResponse.builder()
                        .status(status)
                        .total(orderRepository.countByStatus(status))
                        .build())
                .toList();
    }

    public List<TopCustomerResponse> getTopCustomers(int limit) {
        if (limit <= 0) {
            limit = 5;
        }
        return orderRepository.findTopCustomers(org.springframework.data.domain.PageRequest.of(0, Math.min(limit, 100)));
    }

    private static class RevenueAccumulator {
        private BigDecimal revenue = BigDecimal.ZERO;
        private long paymentCount;
    }
}
