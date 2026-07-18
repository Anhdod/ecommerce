package com.example.ecommerce.config;

import com.example.ecommerce.repository.order.OrderItemRepository;
import com.example.ecommerce.repository.products.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
@RequiredArgsConstructor
@Order(200)
public class CostPriceBackfill implements ApplicationRunner {

    private static final BigDecimal DEMO_COST_RATIO = new BigDecimal("0.70");

    private final ProductRepository productRepository;
    private final OrderItemRepository orderItemRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        productRepository.findAll().forEach(product -> {
            if (product.getCostPrice() == null) {
                product.setCostPrice(estimateCost(product.getPrice()));
            }
        });

        orderItemRepository.findAll().forEach(item -> {
            if (item.getCostPrice() == null) {
                BigDecimal productCost = item.getProduct().getCostPrice();
                item.setCostPrice(productCost == null ? estimateCost(item.getPrice()) : productCost);
            }
        });
    }

    private BigDecimal estimateCost(BigDecimal salePrice) {
        if (salePrice == null) {
            return BigDecimal.ZERO;
        }
        return salePrice.multiply(DEMO_COST_RATIO).setScale(0, RoundingMode.HALF_UP);
    }
}
