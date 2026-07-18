package com.example.ecommerce.service.products;

import com.example.ecommerce.dto.products.ProductRequest;
import com.example.ecommerce.dto.products.ProductResponse;
import com.example.ecommerce.entity.product.Category;
import com.example.ecommerce.entity.product.Product;
import com.example.ecommerce.repository.order.OrderItemRepository;
import com.example.ecommerce.repository.products.CategoryRepository;
import com.example.ecommerce.repository.products.ProductRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

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

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Transactional
    public ProductResponse createProduct(ProductRequest request) {
        Long categoryId = request.getCategoryId();
        if (categoryId == null) {
            throw new RuntimeException("categoryId khong duoc null");
        }

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new RuntimeException("Khong tim thay danh muc voi id: " + categoryId));

        Product product = Product.builder()
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .stockQuantity(request.getStockQuantity())
                .imageUrl(request.getImageUrl())
                .brand(normalizeText(request.getBrand()))
                .warrantyMonths(request.getWarrantyMonths())
                .colors(normalizeColors(request.getColors()))
                .category(category)
                .active(true)
                .featured(request.getFeatured() != null && request.getFeatured())
                .build();

        Product savedProduct = productRepository.save(product);
        return convertToResponse(savedProduct);
    }

    @Transactional(readOnly = true)
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

    @Transactional(readOnly = true)
    public Page<ProductResponse> getAllProducts(
            String keyword,
            Long categoryId,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Double minRating,
            String sort,
            int page,
            int size) {
        boolean aggregateSort = "ratingDesc".equals(sort) || "soldDesc".equals(sort);
        Pageable pageable = PageRequest.of(page, size, aggregateSort ? Sort.unsorted() : resolveSort(sort));
        String normalizedKeyword = keyword == null || keyword.trim().isEmpty() ? null : keyword.trim();

        if ("ratingDesc".equals(sort)) {
            return productRepository
                    .searchActiveProductsOrderByRating(normalizedKeyword, categoryId, minPrice, maxPrice, minRating,
                            pageable)
                    .map(this::convertToResponse);
        }

        if ("soldDesc".equals(sort)) {
            return productRepository
                    .searchActiveProductsOrderBySold(normalizedKeyword, categoryId, minPrice, maxPrice, minRating,
                            pageable)
                    .map(this::convertToResponse);
        }

        if (minRating != null) {
            return productRepository
                    .searchActiveProductsWithRating(normalizedKeyword, categoryId, minPrice, maxPrice, minRating,
                            pageable)
                    .map(this::convertToResponse);
        }

        return productRepository.searchActiveProducts(normalizedKeyword, categoryId, minPrice, maxPrice, pageable)
                .map(this::convertToResponse);
    }

    @Transactional(readOnly = true)
    public ProductResponse getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Khong tim thay san pham"));
        return convertToResponse(product);
    }

    @Transactional(readOnly = true)
    public Page<ProductResponse> getFeaturedProducts(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return productRepository.findByActiveTrueAndFeaturedTrue(pageable)
                .map(this::convertToResponse);
    }

    @Transactional
    public ProductResponse updateProduct(Long id, ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Khong tim thay san pham voi id: " + id));

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new RuntimeException("Khong tim thay danh muc voi id: " + request.getCategoryId()));
            product.setCategory(category);
        }

        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setStockQuantity(request.getStockQuantity());
        product.setBrand(normalizeText(request.getBrand()));
        product.setWarrantyMonths(request.getWarrantyMonths());
        List<String> normalizedColors = normalizeColors(request.getColors());
        if (product.getColors() == null) {
            product.setColors(normalizedColors);
        } else {
            product.getColors().clear();
            product.getColors().addAll(normalizedColors);
        }
        if (request.getImageUrl() != null) {
            product.setImageUrl(request.getImageUrl());
        }
        if (request.getFeatured() != null) {
            product.setFeatured(request.getFeatured());
        }

        Product updatedProduct = productRepository.save(product);
        return convertToResponse(updatedProduct);
    }

    @Transactional
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Khong tim thay san pham voi id: " + id));
        product.setActive(false);
        productRepository.save(product);
    }

    @Transactional
    public void updateProductImage(Long productId, String imageUrl) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Khong tim thay san pham"));
        product.setImageUrl(imageUrl);
        productRepository.save(product);
    }

    @Transactional
    public void addProductImages(Long productId, List<String> imageUrls) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Khong tim thay san pham"));
        if (product.getImageUrls() == null) {
            product.setImageUrls(new ArrayList<>());
        }
        imageUrls.stream()
                .filter(url -> url != null && !url.isBlank())
                .filter(url -> !product.getImageUrls().contains(url))
                .forEach(product.getImageUrls()::add);
        productRepository.save(product);
    }

    @Transactional
    public boolean removeProductImage(Long productId, String imageUrl) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Khong tim thay san pham"));
        if (product.getImageUrls() == null) {
            return false;
        }
        boolean removed = product.getImageUrls().remove(imageUrl);
        if (removed) {
            productRepository.save(product);
        }
        return removed;
    }

    @Transactional
    public boolean deleteProductImage(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Khong tim thay san pham"));

        if (product.getImageUrl() == null || product.getImageUrl().isEmpty()) {
            return false;
        }

        product.setImageUrl(null);
        productRepository.save(product);
        return true;
    }

    private Sort resolveSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by("createdAt").descending();
        }

        return switch (sort) {
            case "priceAsc" -> Sort.by("price").ascending();
            case "priceDesc" -> Sort.by("price").descending();
            case "nameAsc" -> Sort.by("name").ascending();
            case "nameDesc" -> Sort.by("name").descending();
            case "oldest" -> Sort.by("createdAt").ascending();
            case "latest" -> Sort.by("createdAt").descending();
            default -> Sort.by("createdAt").descending();
        };
    }

    private ProductResponse convertToResponse(Product product) {
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
                .categoryId(product.getCategory().getId())
                .categoryName(product.getCategory().getName())
                .active(product.isActive())
                .featured(product.isFeatured())
                .createdAt(product.getCreatedAt())
                .likeCount(productLikeService.getLikeCount(product.getId()))
                .reviewCount((int) reviewService.getReviewCount(product.getId()))
                .averageRating(reviewService.getAverageRating(product.getId()))
                .isLikedByCurrentUser(productLikeService.isLikedByCurrentUser(product.getId()))
                .salesCount(orderItemRepository.sumSoldQuantityByProductId(product.getId()))
                .build();
    }

    private String normalizeText(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private List<String> normalizeColors(List<String> colors) {
        if (colors == null) {
            return new ArrayList<>();
        }
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        colors.stream()
                .filter(color -> color != null && !color.isBlank())
                .map(String::trim)
                .forEach(normalized::add);
        return new ArrayList<>(normalized);
    }
}
