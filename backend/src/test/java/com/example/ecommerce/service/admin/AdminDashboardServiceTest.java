package com.example.ecommerce.service.admin;

import com.example.ecommerce.dto.admin.RevenuePointResponse;
import com.example.ecommerce.entity.order.Order;
import com.example.ecommerce.entity.order.OrderItem;
import com.example.ecommerce.entity.order.OrderStatus;
import com.example.ecommerce.entity.finance.ExpenseCategory;
import com.example.ecommerce.entity.finance.OperatingExpense;
import com.example.ecommerce.entity.payment.Payment;
import com.example.ecommerce.entity.payment.PaymentStatus;
import com.example.ecommerce.repository.auth.UserRepository;
import com.example.ecommerce.repository.finance.OperatingExpenseRepository;
import com.example.ecommerce.repository.order.OrderItemRepository;
import com.example.ecommerce.repository.order.OrderRepository;
import com.example.ecommerce.repository.payment.PaymentRepository;
import com.example.ecommerce.repository.products.ProductRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminDashboardServiceTest {

    @Mock
    private OrderRepository orderRepository;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private OrderItemRepository orderItemRepository;
    @Mock
    private OperatingExpenseRepository operatingExpenseRepository;

    @InjectMocks
    private AdminDashboardService dashboardService;

    @Test
    void revenueTimelineCalculatesProfitFromOrderItemCostSnapshot() {
        Order order = Order.builder()
                .status(OrderStatus.DELIVERED)
                .totalPrice(new BigDecimal("1000000"))
                .shippingFee(new BigDecimal("50000"))
                .shippingCost(new BigDecimal("40000"))
                .packagingCost(new BigDecimal("10000"))
                .paymentFee(new BigDecimal("20000"))
                .platformFee(new BigDecimal("10000"))
                .refundAmount(new BigDecimal("50000"))
                .items(new ArrayList<>())
                .build();
        OrderItem item = OrderItem.builder()
                .order(order)
                .quantity(2)
                .price(new BigDecimal("500000"))
                .costPrice(new BigDecimal("300000"))
                .build();
        order.getItems().add(item);

        Payment payment = Payment.builder()
                .order(order)
                .status(PaymentStatus.PAID)
                .amount(new BigDecimal("1000000"))
                .paymentDate(LocalDateTime.of(2026, 7, 18, 10, 0))
                .build();
        when(paymentRepository.findByStatus(PaymentStatus.PAID)).thenReturn(List.of(payment));
        OperatingExpense expense = OperatingExpense.builder()
                .category(ExpenseCategory.SOFTWARE)
                .amount(new BigDecimal("70000"))
                .expenseDate(java.time.LocalDate.of(2026, 7, 18))
                .build();
        when(operatingExpenseRepository.findAll()).thenReturn(List.of(expense));

        List<RevenuePointResponse> result = dashboardService.getRevenueTimeline("day", null, null);

        assertThat(result).singleElement().satisfies(point -> {
            assertThat(point.getRevenue()).isEqualByComparingTo("950000");
            assertThat(point.getCost()).isEqualByComparingTo("600000");
            assertThat(point.getGrossProfit()).isEqualByComparingTo("300000");
            assertThat(point.getOrderProfit()).isEqualByComparingTo("270000");
            assertThat(point.getOperatingExpense()).isEqualByComparingTo("70000");
            assertThat(point.getProfit()).isEqualByComparingTo("200000");
            assertThat(point.getPaymentCount()).isEqualTo(1);
        });
    }
}
