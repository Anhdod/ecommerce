package com.example.ecommerce.controller.products;

import com.example.ecommerce.dto.ApiResponse;
import com.example.ecommerce.dto.products.ProductReviewRequest;
import com.example.ecommerce.dto.products.ProductReviewResponse;
import com.example.ecommerce.service.products.ProductReviewService;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/products")
public class ProductReviewController {

    @Autowired
    private ProductReviewService reviewService;

    // Tạo hoặc cập nhật review
    @PostMapping("/{productId}/reviews")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<ProductReviewResponse>> createOrUpdateReview(
            @PathVariable Long productId,
            @Valid @RequestBody ProductReviewRequest request) {

        ApiResponse<ProductReviewResponse> response = reviewService.createOrUpdateReview(productId, request);
        return ResponseEntity.ok(response);
    }

    // Lấy danh sách review của sản phẩm
    @GetMapping("/{productId}/reviews")
    public ResponseEntity<ApiResponse<Page<ProductReviewResponse>>> getProductReviews(
            @PathVariable Long productId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Page<ProductReviewResponse> reviews = reviewService.getReviewsByProduct(productId, page, size);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đánh giá thành công", reviews));
    }

    // Xóa review
    @DeleteMapping("/reviews/{reviewId}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<String>> deleteReview(@PathVariable Long reviewId) {
        ApiResponse<String> response = reviewService.deleteReviewById(reviewId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{productId}/reviews")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<ProductReviewResponse>> updateReview(
            @PathVariable Long productId,
            @Valid @RequestBody ProductReviewRequest request) {

        return ResponseEntity.ok(
                reviewService.updateReview(productId, request));
    }
}