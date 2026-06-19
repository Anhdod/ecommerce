package com.example.ecommerce.repository.products;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.ecommerce.entity.product.ProductLike;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductLikeRepository extends JpaRepository<ProductLike, Long> {

    Optional<ProductLike> findByProductIdAndUserId(Long productId, Long userId);

    int countByProductId(Long productId);

    boolean existsByProductIdAndUserId(Long productId, Long userId);

    void deleteByProductIdAndUserId(Long productId, Long userId);

    List<ProductLike> findByUserIdOrderByCreatedAtDesc(Long userId);
}
