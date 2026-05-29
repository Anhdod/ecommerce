package com.example.ecommerce.service.products;

import com.example.ecommerce.dto.ApiResponse;
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

@Service
public class ProductLikeService {

    @Autowired
    private ProductLikeRepository productLikeRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    //  TOGGLE LIKE
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

    //COUNT
    public long getLikeCount(Long productId) {
        return productLikeRepository.countByProductId(productId);
    }

    //  CHECK LIKE
   public boolean isLikedByCurrentUser(Long productId) {
            User user = getCurrentUser();

            if (user == null) {
                return false;
            }

            return productLikeRepository.existsByProductIdAndUserId(productId, user.getId());
        }

    //  HELPER 
    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();

        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));
    }
}