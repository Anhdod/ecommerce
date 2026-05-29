package com.example.ecommerce.service.products;

import com.example.ecommerce.dto.ApiResponse;
import com.example.ecommerce.dto.products.ProductReviewRequest;
import com.example.ecommerce.dto.products.ProductReviewResponse;
import com.example.ecommerce.entity.auth.User;
import com.example.ecommerce.entity.product.Product;
import com.example.ecommerce.entity.product.ProductReview;
import com.example.ecommerce.repository.auth.UserRepository;
import com.example.ecommerce.repository.products.ProductRepository;
import com.example.ecommerce.repository.products.ProductReviewRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductReviewService {

    @Autowired
    private ProductReviewRepository reviewRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional
    public ApiResponse<ProductReviewResponse> createOrUpdateReview(Long productId, ProductReviewRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));

        // Kiểm tra user đã review chưa
        ProductReview existingReview = reviewRepository.findByProductIdAndUserId(productId, user.getId())
                .orElse(null);

        ProductReview review;
        String message;

        if (existingReview != null) {
            // Update review cũ
            existingReview.setRating(request.getRating());
            existingReview.setComment(request.getComment());
            review = reviewRepository.save(existingReview);
            message = "Cập nhật đánh giá thành công";
        } else {
            // Tạo review mới
            review = ProductReview.builder()
                    .product(product)
                    .user(user)
                    .rating(request.getRating())
                    .comment(request.getComment())
                    .build();
            review = reviewRepository.save(review);
            message = "Đánh giá sản phẩm thành công";
        }

        return ApiResponse.success(message, convertToResponse(review));
    }

    public Page<ProductReviewResponse> getReviewsByProduct(Long productId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<ProductReview> reviews = reviewRepository.findByProductId(productId, pageable);
        return reviews.map(this::convertToResponse);
    }

    // Lấy tổng số review
    public long getReviewCount(Long productId) {
        return reviewRepository.countByProductId(productId);
    }

    // Tính trung bình rating
   public double getAverageRating(Long productId) {
    Double avg = reviewRepository.getAverageRatingByProductId(productId);
    return avg != null ? avg : 0.0;
}

    @Transactional
    public ApiResponse<String> deleteReviewById(Long reviewId) {

        String username = SecurityContextHolder.getContext().getAuthentication().getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

        ProductReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy review"));

        boolean isOwner = review.getUser().getId().equals(user.getId());
        boolean isAdmin = "ADMIN".equals(user.getRole());

        if (!isOwner && !isAdmin) {
            throw new RuntimeException("Bạn không có quyền xóa review này");
        }

        reviewRepository.delete(review);

        return ApiResponse.success("Đã xóa review thành công", null);
    }
    @Transactional
    public ApiResponse<ProductReviewResponse> updateReview(Long productId, ProductReviewRequest request) {

        String username = SecurityContextHolder.getContext().getAuthentication().getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

        ProductReview review = reviewRepository
                .findByProductIdAndUserId(productId, user.getId())
                .orElseThrow(() -> new RuntimeException("Bạn chưa đánh giá sản phẩm này"));

        review.setRating(request.getRating());
        review.setComment(request.getComment());

        review = reviewRepository.save(review);

        return ApiResponse.success("Cập nhật đánh giá thành công", convertToResponse(review));
    }

    private ProductReviewResponse convertToResponse(ProductReview review) {
        return ProductReviewResponse.builder()
                .id(review.getId())
                .productId(review.getProduct().getId())
                .username(review.getUser().getUsername())
                .fullName(review.getUser().getFullName())
                .rating(review.getRating())
                .comment(review.getComment())
                .createdAt(review.getCreatedAt())
                .build();
    }

}