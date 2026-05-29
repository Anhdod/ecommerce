package com.example.ecommerce.controller.products;

import com.example.ecommerce.dto.ApiResponse;
import com.example.ecommerce.service.products.ProductService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@RestController
@RequestMapping("/api/products")
public class ProductUploadController {

    @Autowired
    private ProductService productService;

    @Value("${upload.product.dir:uploads/products}")
    private String uploadDir;

    // 1. Upload ảnh mới
    @PostMapping("/{productId}/image")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> uploadProductImage(
            @PathVariable Long productId,
            @RequestParam("file") MultipartFile file) {

        return uploadImage(productId, file);
    }

    // 2. Thay ảnh mới
    @PutMapping("/{productId}/image")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> updateProductImage(
            @PathVariable Long productId,
            @RequestParam("file") MultipartFile file) {

        return uploadImage(productId, file);
    }

    // 3. Xóa ảnh
    @DeleteMapping("/{productId}/image")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> deleteProductImage(@PathVariable Long productId) {
        boolean success = productService.deleteProductImage(productId);
        if (success) {
            return ResponseEntity.ok(ApiResponse.success("Xóa ảnh thành công", null));
        }
        return ResponseEntity.badRequest().body(ApiResponse.error("Không tìm thấy ảnh hoặc không có quyền"));
    }

    private ResponseEntity<ApiResponse<String>> uploadImage(Long productId, MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("File ảnh không được để trống"));
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Chỉ chấp nhận file ảnh"));
        }

        try {
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String extension = file.getOriginalFilename().substring(file.getOriginalFilename().lastIndexOf("."));
            String newFileName = productId + "_" + UUID.randomUUID() + extension;

            Path filePath = uploadPath.resolve(newFileName);
            Files.copy(file.getInputStream(), filePath);

            String imageUrl = "/uploads/products/" + newFileName;

            // Cập nhật ảnh vào sản phẩm
            productService.updateProductImage(productId, imageUrl);

            return ResponseEntity.ok(ApiResponse.success("Cập nhật ảnh thành công", imageUrl));

        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Upload ảnh thất bại: " + e.getMessage()));
        }
    }
}