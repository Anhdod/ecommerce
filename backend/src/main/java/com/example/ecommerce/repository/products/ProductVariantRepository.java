package com.example.ecommerce.repository.products;

import com.example.ecommerce.entity.product.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {
    Optional<ProductVariant> findBySkuIgnoreCase(String sku);
}
