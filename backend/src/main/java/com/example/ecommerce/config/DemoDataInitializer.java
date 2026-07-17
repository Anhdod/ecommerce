package com.example.ecommerce.config;

import com.example.ecommerce.entity.product.Category;
import com.example.ecommerce.entity.product.Product;
import com.example.ecommerce.repository.products.CategoryRepository;
import com.example.ecommerce.repository.products.ProductRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.util.List;

@Configuration
public class DemoDataInitializer {

    @Bean
    public CommandLineRunner seedDemoProducts(CategoryRepository categoryRepository,
                                              ProductRepository productRepository) {
        return args -> {
            if (productRepository.count() > 0) {
                return;
            }

            Category phones = categoryRepository.save(Category.builder()
                    .name("Phones")
                    .description("Smartphones and mobile accessories")
                    .featured(true)
                    .build());

            Category laptops = categoryRepository.save(Category.builder()
                    .name("Laptops")
                    .description("Work, gaming, and creator laptops")
                    .featured(true)
                    .build());

            Category audio = categoryRepository.save(Category.builder()
                    .name("Audio")
                    .description("Headphones, speakers, and earbuds")
                    .featured(false)
                    .build());

            productRepository.saveAll(List.of(
                    product("iPhone 15 Pro", "A premium smartphone with A17 Pro performance.", "999.00", 18,
                            "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=80",
                            phones, true),
                    product("Samsung Galaxy S24", "Flagship Android phone with excellent display and camera.", "899.00", 24,
                            "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=900&q=80",
                            phones, true),
                    product("MacBook Air M3", "Lightweight laptop for productivity and development.", "1199.00", 12,
                            "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80",
                            laptops, true),
                    product("Dell XPS 13", "Compact Windows laptop with premium build quality.", "1099.00", 15,
                            "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80",
                            laptops, false),
                    product("Sony WH-1000XM5", "Noise-cancelling wireless headphones for travel and work.", "349.00", 30,
                            "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=900&q=80",
                            audio, true),
                    product("AirPods Pro", "Wireless earbuds with active noise cancellation.", "249.00", 40,
                            "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=900&q=80",
                            audio, false)
            ));
        };
    }

    private Product product(String name,
                            String description,
                            String price,
                            int stockQuantity,
                            String imageUrl,
                            Category category,
                            boolean featured) {
        return Product.builder()
                .name(name)
                .description(description)
                .price(new BigDecimal(price))
                .stockQuantity(stockQuantity)
                .imageUrl(imageUrl)
                .category(category)
                .active(true)
                .featured(featured)
                .build();
    }
}
