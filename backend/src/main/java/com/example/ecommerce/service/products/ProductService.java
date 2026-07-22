package com.example.ecommerce.service.products;

import com.example.ecommerce.dto.products.ProductRequest;
import com.example.ecommerce.dto.products.ProductResponse;
import com.example.ecommerce.dto.products.ProductVariantRequest;
import com.example.ecommerce.dto.products.ProductVariantResponse;
import com.example.ecommerce.entity.product.Category;
import com.example.ecommerce.entity.product.Product;
import com.example.ecommerce.entity.product.ProductVariant;
import com.example.ecommerce.repository.order.OrderItemRepository;
import com.example.ecommerce.repository.products.CategoryRepository;
import com.example.ecommerce.repository.products.ProductRepository;
import com.example.ecommerce.repository.products.ProductVariantRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ProductService {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductVariantRepository productVariantRepository;

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
                .costPrice(request.getCostPrice())
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
        if (request.getVariants() != null) {
            syncVariants(savedProduct, request.getVariants());
            savedProduct = productRepository.save(savedProduct);
        }
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
        product.setCostPrice(request.getCostPrice());
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
        if (request.getVariants() != null) {
            syncVariants(product, request.getVariants());
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
        boolean manager = canViewCostPrice();
        List<ProductVariantResponse> variants = product.getVariants() == null ? List.of() : product.getVariants().stream()
                .filter(variant -> manager || variant.isActive())
                .map(variant -> toVariantResponse(variant, manager))
                .toList();
        return ProductResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .price(product.getPrice())
                .costPrice(manager ? product.getCostPrice() : null)
                .stockQuantity(product.getStockQuantity())
                .imageUrl(product.getImageUrl())
                .imageUrls(product.getImageUrls() == null ? List.of() : new ArrayList<>(product.getImageUrls()))
                .brand(product.getBrand())
                .warrantyMonths(product.getWarrantyMonths())
                .colors(product.getColors() == null ? List.of() : new ArrayList<>(product.getColors()))
                .variants(variants)
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

    private void syncVariants(Product product, List<ProductVariantRequest> requests) {
        if (product.getVariants() == null) {
            product.setVariants(new ArrayList<>());
        }

        Map<Long, ProductVariant> existingById = product.getVariants().stream()
                .filter(variant -> variant.getId() != null)
                .collect(Collectors.toMap(ProductVariant::getId, variant -> variant));
        Set<Long> retainedIds = new LinkedHashSet<>();
        Set<String> requestSkus = new LinkedHashSet<>();

        for (ProductVariantRequest request : requests) {
            String sku = normalizeSku(request.getSku());
            if (!requestSkus.add(sku)) {
                throw new RuntimeException("SKU bị trùng trong danh sách biến thể: " + sku);
            }

            ProductVariant variant;
            if (request.getId() == null) {
                variant = new ProductVariant();
                variant.setProduct(product);
                product.getVariants().add(variant);
            } else {
                variant = existingById.get(request.getId());
                if (variant == null) {
                    throw new RuntimeException("Biến thể không thuộc sản phẩm này: " + request.getId());
                }
                retainedIds.add(variant.getId());
            }

            productVariantRepository.findBySkuIgnoreCase(sku)
                    .filter(found -> variant.getId() == null || !found.getId().equals(variant.getId()))
                    .ifPresent(found -> {
                        throw new RuntimeException("SKU đã tồn tại: " + sku);
                    });

            Map<String, String> attributes = normalizeAttributes(request.getAttributes());
            variant.setSku(sku);
            variant.setName(normalizeVariantName(request.getName(), attributes, sku));
            if (variant.getAttributes() == null) {
                variant.setAttributes(attributes);
            } else {
                variant.getAttributes().clear();
                variant.getAttributes().putAll(attributes);
            }
            variant.setPrice(request.getPrice());
            variant.setCostPrice(request.getCostPrice());
            variant.setStockQuantity(request.getStockQuantity());
            variant.setImageUrl(normalizeText(request.getImageUrl()));
            variant.setActive(request.getActive() == null || request.getActive());
        }

        product.getVariants().stream()
                .filter(variant -> variant.getId() != null && !retainedIds.contains(variant.getId()))
                .forEach(variant -> variant.setActive(false));

        refreshProductFromVariants(product);
    }

    private void refreshProductFromVariants(Product product) {
        List<ProductVariant> activeVariants = product.getVariants().stream()
                .filter(ProductVariant::isActive)
                .toList();
        if (activeVariants.isEmpty()) {
            return;
        }

        product.setPrice(activeVariants.stream().map(ProductVariant::getPrice).min(BigDecimal::compareTo).orElse(product.getPrice()));
        product.setCostPrice(activeVariants.stream().map(ProductVariant::getCostPrice).min(BigDecimal::compareTo).orElse(product.getCostPrice()));
        product.setStockQuantity(activeVariants.stream().mapToInt(ProductVariant::getStockQuantity).sum());

        List<String> colors = activeVariants.stream()
                .map(ProductVariant::getAttributes)
                .map(this::findColorAttribute)
                .filter(value -> value != null && !value.isBlank())
                .distinct()
                .toList();
        if (product.getColors() == null) {
            product.setColors(new ArrayList<>());
        } else {
            product.getColors().clear();
        }
        product.getColors().addAll(colors);
    }

    private ProductVariantResponse toVariantResponse(ProductVariant variant, boolean includeCost) {
        return ProductVariantResponse.builder()
                .id(variant.getId())
                .sku(variant.getSku())
                .name(variant.getName())
                .attributes(new LinkedHashMap<>(variant.getAttributes()))
                .price(variant.getPrice())
                .costPrice(includeCost ? variant.getCostPrice() : null)
                .stockQuantity(variant.getStockQuantity())
                .imageUrl(variant.getImageUrl())
                .active(variant.isActive())
                .build();
    }

    private String normalizeSku(String sku) {
        if (sku == null || sku.isBlank()) {
            throw new RuntimeException("SKU không được để trống");
        }
        return sku.trim().toUpperCase(Locale.ROOT);
    }

    private Map<String, String> normalizeAttributes(Map<String, String> attributes) {
        Map<String, String> normalized = new LinkedHashMap<>();
        if (attributes == null) {
            return normalized;
        }
        attributes.forEach((key, value) -> {
            if (key != null && !key.isBlank() && value != null && !value.isBlank()) {
                normalized.put(key.trim(), value.trim());
            }
        });
        return normalized;
    }

    private String normalizeVariantName(String name, Map<String, String> attributes, String sku) {
        if (name != null && !name.isBlank()) {
            return name.trim();
        }
        String generated = String.join(" / ", attributes.values());
        return generated.isBlank() ? sku : generated;
    }

    private String findColorAttribute(Map<String, String> attributes) {
        if (attributes == null) {
            return null;
        }
        return attributes.entrySet().stream()
                .filter(entry -> {
                    String key = entry.getKey().toLowerCase(Locale.ROOT);
                    return key.equals("màu sắc") || key.equals("mau sac") || key.equals("màu") || key.equals("color");
                })
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse(null);
    }

    private boolean canViewCostPrice() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        return authentication.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority) || "ROLE_STAFF".equals(authority));
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
