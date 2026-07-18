package com.example.ecommerce.config;

import com.example.ecommerce.entity.order.Order;
import com.example.ecommerce.entity.payment.Payment;
import com.example.ecommerce.repository.cart.CartRepository;
import com.example.ecommerce.repository.order.OrderRepository;
import com.example.ecommerce.repository.payment.PaymentRepository;
import com.example.ecommerce.repository.products.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@org.springframework.core.annotation.Order(100)
public class VndCurrencyMigration implements ApplicationRunner {

    private static final BigDecimal LEGACY_PRICE_LIMIT = new BigDecimal("10000");
    private static final BigDecimal VND_RATE = new BigDecimal("25000");
    private static final String MIGRATION_KEY = "currency-vnd-v1";

    private final ProductRepository productRepository;
    private final CartRepository cartRepository;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final JdbcTemplate jdbcTemplate;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS app_metadata (
                    metadata_key VARCHAR(100) PRIMARY KEY,
                    metadata_value VARCHAR(255) NOT NULL
                )
                """);
        Integer completed = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM app_metadata WHERE metadata_key = ?",
                Integer.class,
                MIGRATION_KEY);
        if (completed != null && completed > 0) {
            return;
        }

        productRepository.findAll().forEach(product -> {
            if (isLegacyAmount(product.getPrice())) {
                product.setPrice(toVnd(product.getPrice()));
            }
        });

        cartRepository.findAll().forEach(cart -> cart.getItems().forEach(item -> {
            if (isLegacyAmount(item.getPrice())) {
                item.setPrice(toVnd(item.getPrice()));
            }
        }));

        List<Payment> changedPayments = new ArrayList<>();
        for (Order order : orderRepository.findAll()) {
            boolean convertedOrderItem = false;
            for (var item : order.getItems()) {
                if (isLegacyAmount(item.getPrice())) {
                    item.setPrice(toVnd(item.getPrice()));
                    convertedOrderItem = true;
                }
            }
            if (!convertedOrderItem) {
                continue;
            }

            BigDecimal subtotal = order.calculateTotalPrice();
            BigDecimal discount = order.getDiscountAmount() == null ? BigDecimal.ZERO : order.getDiscountAmount();
            if (isLegacyAmount(discount)) {
                discount = toVnd(discount);
            }
            BigDecimal shippingFee = order.getShippingFee() == null ? BigDecimal.ZERO : order.getShippingFee();
            BigDecimal total = subtotal.subtract(discount).max(BigDecimal.ZERO).add(shippingFee);

            order.setSubtotal(subtotal);
            order.setDiscountAmount(discount);
            order.setTotalPrice(total);
            paymentRepository.findByOrderId(order.getId()).ifPresent(payment -> {
                payment.setAmount(total);
                changedPayments.add(payment);
            });
        }

        productRepository.flush();
        cartRepository.flush();
        orderRepository.flush();
        paymentRepository.saveAll(changedPayments);
        jdbcTemplate.update(
                "INSERT INTO app_metadata (metadata_key, metadata_value) VALUES (?, ?)",
                MIGRATION_KEY,
                java.time.Instant.now().toString());
    }

    private boolean isLegacyAmount(BigDecimal amount) {
        return amount != null
                && amount.compareTo(BigDecimal.ZERO) > 0
                && amount.compareTo(LEGACY_PRICE_LIMIT) < 0;
    }

    private BigDecimal toVnd(BigDecimal amount) {
        return amount.multiply(VND_RATE).setScale(0, java.math.RoundingMode.HALF_UP);
    }
}
