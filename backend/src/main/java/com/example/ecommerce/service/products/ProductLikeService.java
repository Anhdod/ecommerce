package com.example.ecommerce.service.products;

import com.example.ecommerce.dto.ApiResponse;
import com.example.ecommerce.dto.products.ProductResponse;
import com.example.ecommerce.dto.products.ProductVariantResponse;
import com.example.ecommerce.entity.auth.User;
import com.example.ecommerce.entity.product.Product;
import com.example.ecommerce.entity.product.ProductLike;
import com.example.ecommerce.repository.auth.UserRepository;
import com.example.ecommerce.repository.products.ProductLikeRepository;
import com.example.ecommerce.repository.products.ProductRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.stream.Collectors;

@Service
public class ProductLikeService {

    @Autowired
    private ProductLikeRepository productLikeRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductReviewService reviewService;

    // TOGGLE LIKE
    @Transactional
    public ApiResponse<String> toggleLike(Long productId) {

        User user = getCurrentUser();

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));

        if (productLikeRepository.existsByProductIdAndUserId(productId, user.getId())) {

            productLikeRepository.deleteByProductIdAndUserId(productId, user.getId());
            return ApiResponse.success("Đã bỏ thích sản phẩm", null);

        } else {

            ProductLike like = ProductLike.builder()
                    .product(product)
                    .user(user)
                    .build();

            productLikeRepository.save(like);
            return ApiResponse.success("Đã thích sản phẩm", null);
        }
    }

    // COUNT
    public long getLikeCount(Long productId) {
        return productLikeRepository.countByProductId(productId);
    }

    // CHECK LIKE
    public boolean isLikedByCurrentUser(Long productId) {
        User user = getCurrentUser();

        if (user == null) {
            return false;
        }

        return productLikeRepository.existsByProductIdAndUserId(productId, user.getId());
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> getMyLikedProducts() {
        User user = getCurrentUser();
        if (user == null) {
            return List.of();
        }

        return productLikeRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(ProductLike::getProduct)
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // HELPER
    private User getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }

        Object principal = auth.getPrincipal();
        if (principal instanceof String && "anonymousUser".equals(principal)) {
            return null;
        }

        String username = auth.getName();

        return userRepository.findByUsername(username).orElse(null);
    }

    private ProductResponse toResponse(Product product) {
        return ProductResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .price(product.getPrice())
                .stockQuantity(product.getStockQuantity())
                .imageUrl(product.getImageUrl())
                .imageUrls(product.getImageUrls() == null ? List.of() : new ArrayList<>(product.getImageUrls()))
                .brand(product.getBrand())
                .warrantyMonths(product.getWarrantyMonths())
                .colors(product.getColors() == null ? List.of() : new ArrayList<>(product.getColors()))
                .variants(product.getVariants() == null ? List.of() : product.getVariants().stream()
                        .filter(variant -> variant.isActive())
                        .map(variant -> ProductVariantResponse.builder()
                                .id(variant.getId())
                                .sku(variant.getSku())
                                .name(variant.getName())
                                .attributes(new LinkedHashMap<>(variant.getAttributes()))
                                .price(variant.getPrice())
                                .stockQuantity(variant.getStockQuantity())
                                .imageUrl(variant.getImageUrl())
                                .active(true)
                                .build())
                        .toList())
                .categoryId(product.getCategory().getId())
                .categoryName(product.getCategory().getName())
                .active(product.isActive())
                .createdAt(product.getCreatedAt())
                .likeCount(getLikeCount(product.getId()))
                .reviewCount((int) reviewService.getReviewCount(product.getId()))
                .averageRating(reviewService.getAverageRating(product.getId()))
                .isLikedByCurrentUser(true)
                .salesCount(0L)
                .build();
    }
}
