package com.example.ecommerce.service.admin;

import com.example.ecommerce.dto.admin.AdminDashboardResponse;
import com.example.ecommerce.dto.admin.OrderStatusStatResponse;
import com.example.ecommerce.dto.admin.RevenuePointResponse;
import com.example.ecommerce.dto.admin.TopCustomerResponse;
import com.example.ecommerce.entity.order.OrderStatus;
import com.example.ecommerce.entity.payment.Payment;
import com.example.ecommerce.entity.payment.PaymentStatus;
import com.example.ecommerce.repository.finance.OperatingExpenseRepository;
import com.example.ecommerce.repository.order.OrderRepository;
import com.example.ecommerce.repository.payment.PaymentRepository;
import com.example.ecommerce.repository.products.ProductRepository;
import com.example.ecommerce.repository.auth.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
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

    @Autowired
    private OperatingExpenseRepository operatingExpenseRepository;

    @Cacheable(value = "adminDashboardSummary", key = "'summary-v3'")
    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboardSummary() {
        List<Payment> paidPayments = paymentRepository.findByStatus(PaymentStatus.PAID).stream()
                .filter(payment -> payment.getOrder().getStatus() != OrderStatus.CANCELLED)
                .toList();
        BigDecimal totalRevenue = paidPayments.stream()
                .map(payment -> payment.getOrder().calculateNetRevenue())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCost = paidPayments.stream()
                .map(this::calculateOrderCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalGrossProfit = paidPayments.stream()
                .map(payment -> payment.getOrder().calculateGrossProfit())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalOrderProfit = paidPayments.stream()
                .map(payment -> payment.getOrder().calculateOrderProfit())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalOperatingExpense = operatingExpenseRepository.findAll().stream()
                .map(expense -> expense.getAmount() == null ? BigDecimal.ZERO : expense.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalProfit = totalOrderProfit.subtract(totalOperatingExpense);
        BigDecimal profitMargin = totalRevenue.signum() == 0
                ? BigDecimal.ZERO
                : totalProfit.multiply(BigDecimal.valueOf(100))
                        .divide(totalRevenue, 2, RoundingMode.HALF_UP);

        long totalPaidPayments = paidPayments.size();
        long totalPendingPayments = paymentRepository.findByStatus(PaymentStatus.PENDING).size()
                + paymentRepository.findByStatus(PaymentStatus.SUBMITTED).size()
                + paymentRepository.findByStatus(PaymentStatus.REJECTED).size();

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
                .totalCost(totalCost)
                .totalGrossProfit(totalGrossProfit)
                .totalOrderProfit(totalOrderProfit)
                .totalOperatingExpense(totalOperatingExpense)
                .totalProfit(totalProfit)
                .profitMargin(profitMargin)
                .totalPaidPayments(totalPaidPayments)
                .totalPendingPayments(totalPendingPayments)
                .totalProducts(productRepository.count())
                .totalCustomers(userRepository.count())
                .topSellingProducts(topSelling)
                .build();
    }

    @Cacheable(value = "adminDashboardTopSelling", key = "#limit")
    public java.util.List<com.example.ecommerce.dto.admin.TopSellingProductResponse> getTopSelling(int limit) {
        if (limit <= 0)
            limit = 5;
        return orderItemRepository
                .findTopSellingProducts(org.springframework.data.domain.PageRequest.of(0, Math.min(limit, 100)));
    }

    @Cacheable(value = "adminDashboardRevenue", key = "'v3:' + #groupBy + ':' + #from + ':' + #to")
    @Transactional(readOnly = true)
    public List<RevenuePointResponse> getRevenueTimeline(String groupBy, LocalDate from, LocalDate to) {
        boolean monthly = "month".equalsIgnoreCase(groupBy);
        DateTimeFormatter formatter = monthly ? DateTimeFormatter.ofPattern("yyyy-MM") : DateTimeFormatter.ISO_DATE;
        Map<String, RevenueAccumulator> grouped = new TreeMap<>();

        paymentRepository.findByStatus(PaymentStatus.PAID).stream()
                .filter(payment -> payment.getOrder().getStatus() != OrderStatus.CANCELLED)
                .filter(payment -> payment.getPaymentDate() != null)
                .filter(payment -> from == null || !payment.getPaymentDate().toLocalDate().isBefore(from))
                .filter(payment -> to == null || !payment.getPaymentDate().toLocalDate().isAfter(to))
                .forEach(payment -> {
                    String period = monthly
                            ? YearMonth.from(payment.getPaymentDate()).format(formatter)
                            : payment.getPaymentDate().toLocalDate().format(formatter);
                    RevenueAccumulator accumulator = grouped.computeIfAbsent(period, key -> new RevenueAccumulator());
                    accumulator.revenue = accumulator.revenue.add(payment.getOrder().calculateNetRevenue());
                    accumulator.cost = accumulator.cost.add(calculateOrderCost(payment));
                    accumulator.grossProfit = accumulator.grossProfit.add(payment.getOrder().calculateGrossProfit());
                    accumulator.orderProfit = accumulator.orderProfit.add(payment.getOrder().calculateOrderProfit());
                    accumulator.paymentCount++;
                });

        operatingExpenseRepository.findAll().stream()
                .filter(expense -> expense.getExpenseDate() != null)
                .filter(expense -> from == null || !expense.getExpenseDate().isBefore(from))
                .filter(expense -> to == null || !expense.getExpenseDate().isAfter(to))
                .forEach(expense -> {
                    String period = monthly
                            ? YearMonth.from(expense.getExpenseDate()).format(formatter)
                            : expense.getExpenseDate().format(formatter);
                    RevenueAccumulator accumulator = grouped.computeIfAbsent(period, key -> new RevenueAccumulator());
                    accumulator.operatingExpense = accumulator.operatingExpense
                            .add(expense.getAmount() == null ? BigDecimal.ZERO : expense.getAmount());
                });

        return grouped.entrySet().stream()
                .map(entry -> RevenuePointResponse.builder()
                        .period(entry.getKey())
                        .revenue(entry.getValue().revenue)
                        .cost(entry.getValue().cost)
                        .grossProfit(entry.getValue().grossProfit)
                        .orderProfit(entry.getValue().orderProfit)
                        .operatingExpense(entry.getValue().operatingExpense)
                        .profit(entry.getValue().orderProfit.subtract(entry.getValue().operatingExpense))
                        .paymentCount(entry.getValue().paymentCount)
                        .build())
                .toList();
    }

    @Cacheable(value = "adminDashboardOrderStatus", key = "'all'")
    public List<OrderStatusStatResponse> getOrderStatusStats() {
        return java.util.Arrays.stream(OrderStatus.values())
                .map(status -> OrderStatusStatResponse.builder()
                        .status(status)
                        .total(orderRepository.countByStatus(status))
                        .build())
                .toList();
    }

    @Cacheable(value = "adminDashboardTopCustomers", key = "#limit")
    public List<TopCustomerResponse> getTopCustomers(int limit) {
        if (limit <= 0) {
            limit = 5;
        }
        return orderRepository.findTopCustomers(org.springframework.data.domain.PageRequest.of(0, Math.min(limit, 100)));
    }

    private static class RevenueAccumulator {
        private BigDecimal revenue = BigDecimal.ZERO;
        private BigDecimal cost = BigDecimal.ZERO;
        private BigDecimal grossProfit = BigDecimal.ZERO;
        private BigDecimal orderProfit = BigDecimal.ZERO;
        private BigDecimal operatingExpense = BigDecimal.ZERO;
        private long paymentCount;
    }

    private BigDecimal calculateOrderCost(Payment payment) {
        return payment.getOrder().getItems().stream()
                .map(item -> item.getCostPrice() == null
                        ? BigDecimal.ZERO
                        : item.getCostPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
