package com.example.ecommerce.service.inventory;

import com.example.ecommerce.dto.inventory.StockAdjustmentRequest;
import com.example.ecommerce.dto.inventory.StockMovementResponse;
import com.example.ecommerce.dto.inventory.StockOverviewResponse;
import com.example.ecommerce.entity.auth.User;
import com.example.ecommerce.entity.inventory.StockMovement;
import com.example.ecommerce.entity.inventory.StockMovementType;
import com.example.ecommerce.entity.product.Product;
import com.example.ecommerce.entity.product.ProductVariant;
import com.example.ecommerce.repository.auth.UserRepository;
import com.example.ecommerce.repository.inventory.StockMovementRepository;
import com.example.ecommerce.repository.products.ProductRepository;
import com.example.ecommerce.repository.products.ProductVariantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryService {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductVariantRepository productVariantRepository;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional(readOnly = true)
    public Page<StockOverviewResponse> getLowStockProducts(int threshold, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return productRepository.findByActiveTrueAndStockQuantityLessThanOrderByStockQuantityAsc(threshold, pageable)
                .map(product -> StockOverviewResponse.builder()
                        .productId(product.getId())
                        .productName(product.getName())
                        .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                        .stockQuantity(product.getStockQuantity())
                        .price(product.getPrice())
                        .imageUrl(product.getImageUrl())
                        .build());
    }

    @Transactional(readOnly = true)
    public Page<StockMovementResponse> getRecentMovements(Long productId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<StockMovement> source = productId == null
                ? stockMovementRepository.findAllByOrderByCreatedAtDesc(pageable)
                : stockMovementRepository.findByProductIdOrderByCreatedAtDesc(productId, pageable);
        return source.map(this::toResponse);
    }

    @Transactional
    public StockMovementResponse adjustStock(Long productId, StockAdjustmentRequest request) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Khong tim thay san pham"));

        if (product.getVariants() != null && product.getVariants().stream().anyMatch(ProductVariant::isActive)) {
            throw new RuntimeException("Sản phẩm có biến thể; hãy điều chỉnh tồn kho trong phần biến thể sản phẩm");
        }

        int previousQuantity = product.getStockQuantity();
        int newQuantity = previousQuantity + request.getQuantityChange();
        if (newQuantity < 0) {
            throw new RuntimeException("So luong ton kho khong du");
        }

        product.setStockQuantity(newQuantity);
        productRepository.save(product);

        StockMovement movement = StockMovement.builder()
                .product(product)
                .movementType(request.getMovementType())
                .quantityChange(request.getQuantityChange())
                .previousQuantity(previousQuantity)
                .newQuantity(newQuantity)
                .reason(request.getReason())
                .note(request.getNote())
                .performedBy(getCurrentUsername())
                .build();

        return toResponse(stockMovementRepository.save(movement));
    }

    @Transactional
    public void recordMovement(Product product, int quantityChange, StockMovementType type, String reason, String note) {
        recordMovement(product, null, quantityChange, type, reason, note);
    }

    @Transactional
    public void recordMovement(Product product, ProductVariant variant, int quantityChange, StockMovementType type, String reason, String note) {
        int previousQuantity = product.getStockQuantity();
        if (variant != null) {
            int newVariantQuantity = variant.getStockQuantity() + quantityChange;
            if (newVariantQuantity < 0) {
                throw new RuntimeException("Biến thể " + variant.getSku() + " không đủ tồn kho");
            }
            variant.setStockQuantity(newVariantQuantity);
            productVariantRepository.save(variant);
            product.setStockQuantity(product.getVariants().stream()
                    .filter(ProductVariant::isActive)
                    .mapToInt(ProductVariant::getStockQuantity)
                    .sum());
        } else {
            int newQuantity = previousQuantity + quantityChange;
            if (newQuantity < 0) {
                throw new RuntimeException("So luong ton kho khong du");
            }
            product.setStockQuantity(newQuantity);
        }

        productRepository.save(product);
        int newQuantity = product.getStockQuantity();

        StockMovement movement = StockMovement.builder()
                .product(product)
                .movementType(type)
                .quantityChange(quantityChange)
                .previousQuantity(previousQuantity)
                .newQuantity(newQuantity)
                .reason(reason)
                .note(note)
                .performedBy(getCurrentUsername())
                .build();
        stockMovementRepository.save(movement);
    }

    private String getCurrentUsername() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            return "system";
        }
        return auth.getName();
    }

    private StockMovementResponse toResponse(StockMovement movement) {
        return StockMovementResponse.builder()
                .id(movement.getId())
                .productId(movement.getProduct().getId())
                .productName(movement.getProduct().getName())
                .movementType(movement.getMovementType())
                .quantityChange(movement.getQuantityChange())
                .previousQuantity(movement.getPreviousQuantity())
                .newQuantity(movement.getNewQuantity())
                .reason(movement.getReason())
                .note(movement.getNote())
                .performedBy(movement.getPerformedBy())
                .createdAt(movement.getCreatedAt())
                .build();
    }
}
