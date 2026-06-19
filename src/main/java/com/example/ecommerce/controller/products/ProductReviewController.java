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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/products")
public class ProductReviewController {

    @Autowired
    private ProductReviewService reviewService;

    @PostMapping("/{productId}/reviews")
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<ProductReviewResponse>> createOrUpdateReview(
            @PathVariable Long productId,
            @Valid @RequestBody ProductReviewRequest request) {

        ApiResponse<ProductReviewResponse> response = reviewService.createOrUpdateReview(productId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{productId}/reviews")
    public ResponseEntity<ApiResponse<Page<ProductReviewResponse>>> getProductReviews(
            @PathVariable Long productId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Page<ProductReviewResponse> reviews = reviewService.getReviewsByProduct(productId, page, size);
        return ResponseEntity.ok(ApiResponse.success("Product reviews fetched successfully", reviews));
    }

    @GetMapping("/{productId}/reviews/admin")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<Page<ProductReviewResponse>>> getProductReviewsForAdmin(
            @PathVariable Long productId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<ProductReviewResponse> reviews = reviewService.getReviewsByProductForAdmin(productId, page, size);
        return ResponseEntity.ok(ApiResponse.success("Product reviews fetched successfully", reviews));
    }

    @GetMapping("/reviews")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<Page<ProductReviewResponse>>> getAllReviews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<ProductReviewResponse> reviews = reviewService.getAllReviews(page, size);
        return ResponseEntity.ok(ApiResponse.success("Reviews fetched successfully", reviews));
    }

    @DeleteMapping("/reviews/{reviewId}")
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<String>> deleteReview(@PathVariable Long reviewId) {
        ApiResponse<String> response = reviewService.deleteReviewById(reviewId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/reviews/{reviewId}/hidden")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<ProductReviewResponse>> setReviewHidden(
            @PathVariable Long reviewId,
            @RequestParam boolean hidden) {

        return ResponseEntity.ok(reviewService.setReviewHidden(reviewId, hidden));
    }

    @PutMapping("/{productId}/reviews")
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<ProductReviewResponse>> updateReview(
            @PathVariable Long productId,
            @Valid @RequestBody ProductReviewRequest request) {

        return ResponseEntity.ok(reviewService.updateReview(productId, request));
    }

    @PostMapping("/{productId}/reviews/image")
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<ProductReviewResponse>> uploadReviewImage(
            @PathVariable Long productId,
            @RequestParam("file") MultipartFile file) {

        return ResponseEntity.ok(reviewService.uploadReviewImage(productId, file));
    }
}
