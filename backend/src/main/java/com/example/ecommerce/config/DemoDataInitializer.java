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
                enrichDemoProducts(productRepository);
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
                    product("iPhone 15 Pro", "A premium smartphone with A17 Pro performance.", "24975000", 18,
                            "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=80",
                            phones, true),
                    product("Samsung Galaxy S24", "Flagship Android phone with excellent display and camera.", "22475000", 24,
                            "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=900&q=80",
                            phones, true),
                    product("MacBook Air M3", "Lightweight laptop for productivity and development.", "29975000", 12,
                            "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80",
                            laptops, true),
                    product("Dell XPS 13", "Compact Windows laptop with premium build quality.", "27475000", 15,
                            "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80",
                            laptops, false),
                    product("Sony WH-1000XM5", "Noise-cancelling wireless headphones for travel and work.", "8725000", 30,
                            "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=900&q=80",
                            audio, true),
                    product("AirPods Pro", "Wireless earbuds with active noise cancellation.", "6225000", 40,
                            "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=900&q=80",
                            audio, false)
            ));
            enrichDemoProducts(productRepository);
        };
    }

    private void enrichDemoProducts(ProductRepository productRepository) {
        productRepository.findAll().forEach(product -> {
            ProductDetails details = switch (product.getName()) {
                case "iPhone 15 Pro" -> new ProductDetails("Apple", List.of("Titan Đen", "Titan Xanh", "Titan Tự nhiên"));
                case "Samsung Galaxy S24" -> new ProductDetails("Samsung", List.of("Đen", "Tím", "Vàng"));
                case "MacBook Air M3" -> new ProductDetails("Apple", List.of("Bạc", "Xám", "Xanh đêm"));
                case "Dell XPS 13" -> new ProductDetails("Dell", List.of("Bạc", "Đen"));
                case "Sony WH-1000XM5" -> new ProductDetails("Sony", List.of("Đen", "Bạc"));
                case "AirPods Pro" -> new ProductDetails("Apple", List.of("Trắng"));
                default -> null;
            };
            if (details == null) {
                return;
            }
            boolean changed = false;
            if (product.getBrand() == null || product.getBrand().isBlank()) {
                product.setBrand(details.brand());
                changed = true;
            }
            if (product.getWarrantyMonths() == null) {
                product.setWarrantyMonths(12);
                changed = true;
            }
            if (product.getColors() == null || product.getColors().isEmpty()) {
                product.setColors(new java.util.ArrayList<>(details.colors()));
                changed = true;
            }
            if (changed) {
                productRepository.save(product);
            }
        });
    }

    private record ProductDetails(String brand, List<String> colors) {}

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
