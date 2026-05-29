package com.example.ecommerce.controller.products;

import com.example.ecommerce.dto.ApiResponse;
import com.example.ecommerce.service.products.ProductLikeService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/products")
public class ProductLikeController {

    @Autowired
    private ProductLikeService productLikeService;

    // Toggle Like / Unlike
    @PostMapping("/{productId}/like")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<String>> toggleLike(@PathVariable Long productId) {
        ApiResponse<String> response = productLikeService.toggleLike(productId);
        return ResponseEntity.ok(response);
    }

    // Lấy số lượt like
    @GetMapping("/{productId}/like-count")
    public ResponseEntity<ApiResponse<Long>> getLikeCount(@PathVariable Long productId) {

        long count = productLikeService.getLikeCount(productId);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy số lượt thích thành công", count));
    }
}