package com.example.ecommerce.service.products;

import com.example.ecommerce.dto.products.ProductRequest;
import com.example.ecommerce.dto.products.ProductResponse;
import com.example.ecommerce.entity.product.Category;
import com.example.ecommerce.entity.product.Product;
import com.example.ecommerce.repository.products.CategoryRepository;
import com.example.ecommerce.repository.products.ProductRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

// import java.util.List; (unused)

@Service
public class ProductService {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductLikeService productLikeService;

    @Autowired
    private ProductReviewService reviewService;

    // ==================== CRUD ====================

    public ProductResponse createProduct(ProductRequest request) {
        Long categoryId = request.getCategoryId();
        if (categoryId == null) {
            throw new RuntimeException("categoryId không được null");
        }

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục với id: " + categoryId));

        Product product = Product.builder()
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .stockQuantity(request.getStockQuantity())
                .imageUrl(request.getImageUrl())
                .category(category)
                .active(true)
                .build();

        Product savedProduct = productRepository.save(product);
        return convertToResponse(savedProduct);
    }

    public Page<ProductResponse> getAllProducts(String keyword, Long categoryId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        Page<Product> products;

        if (keyword != null && !keyword.trim().isEmpty()) {
            products = productRepository.findByNameContainingIgnoreCaseAndActiveTrue(keyword.trim(), pageable);
        } else if (categoryId != null) {
            products = productRepository.findByCategoryIdAndActiveTrue(categoryId, pageable);
        } else {
            products = productRepository.findByActiveTrue(pageable);
        }

        return products.map(this::convertToResponse);
    }

    public ProductResponse getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));

        return convertToResponse(product);
    }

    public ProductResponse updateProduct(Long id, ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm với id: " + id));

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(
                            () -> new RuntimeException("Không tìm thấy danh mục với id: " + request.getCategoryId()));
            product.setCategory(category);
        }

        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setStockQuantity(request.getStockQuantity());
        if (request.getImageUrl() != null) {
            product.setImageUrl(request.getImageUrl());
        }

        Product updatedProduct = productRepository.save(product);
        return convertToResponse(updatedProduct);
    }

    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm với id: " + id));

        product.setActive(false);
        productRepository.save(product);
    }

    // ==================== IMAGE ====================

    public void updateProductImage(Long productId, String imageUrl) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));
        product.setImageUrl(imageUrl);
        productRepository.save(product);
    }

    public boolean deleteProductImage(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));

        if (product.getImageUrl() == null || product.getImageUrl().isEmpty()) {
            return false;
        }

        product.setImageUrl(null);
        productRepository.save(product);
        return true;
    }

    // ==================== CONVERT ====================

    private ProductResponse convertToResponse(Product product) {
        return ProductResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .price(product.getPrice())
                .stockQuantity(product.getStockQuantity())
                .imageUrl(product.getImageUrl())
                .categoryId(product.getCategory().getId())
                .categoryName(product.getCategory().getName())
                .active(product.isActive())
                .createdAt(product.getCreatedAt())
                .likeCount(productLikeService.getLikeCount(product.getId()))
                .reviewCount((int) reviewService.getReviewCount(product.getId()))
                .averageRating(reviewService.getAverageRating(product.getId()))
                .isLikedByCurrentUser(productLikeService.isLikedByCurrentUser(product.getId()))
                .build();
    }
}