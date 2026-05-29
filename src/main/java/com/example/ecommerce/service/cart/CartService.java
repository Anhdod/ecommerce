package com.example.ecommerce.service.cart;

import com.example.ecommerce.dto.cart.CartItemResponse;
import com.example.ecommerce.dto.cart.CartResponse;
import com.example.ecommerce.entity.auth.User;
import com.example.ecommerce.entity.cart.Cart;
import com.example.ecommerce.entity.cart.CartItem;
import com.example.ecommerce.entity.product.Product;
import com.example.ecommerce.repository.auth.UserRepository;
import com.example.ecommerce.repository.cart.CartRepository;
import com.example.ecommerce.repository.products.ProductRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CartService {

        @Autowired
        private CartRepository cartRepository;

        @Autowired
        private UserRepository userRepository;

        @Autowired
        private ProductRepository productRepository;

        // Lấy giỏ hàng của user hiện tại
        public CartResponse getMyCart() {
                String username = SecurityContextHolder.getContext().getAuthentication().getName();
                User user = userRepository.findByUsername(username)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

                Cart cart = cartRepository.findByUserId(user.getId())
                                .orElseGet(() -> createNewCart(user));

                return convertToResponse(cart);
        }

        // Thêm sản phẩm vào giỏ hàng
        @Transactional
        public CartResponse addToCart(Long productId, int quantity) {
                String username = SecurityContextHolder.getContext().getAuthentication().getName();
                User user = userRepository.findByUsername(username)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

                Product product = productRepository.findById(productId)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));

                if (product.getStockQuantity() < quantity) {
                        throw new RuntimeException("Sản phẩm không đủ tồn kho");
                }

                Cart cart = cartRepository.findByUserId(user.getId())
                                .orElseGet(() -> createNewCart(user));

                // Kiểm tra sản phẩm đã có trong giỏ chưa
                CartItem existingItem = cart.getItems().stream()
                                .filter(item -> item.getProduct().getId().equals(productId))
                                .findFirst()
                                .orElse(null);

                if (existingItem != null) {
                        existingItem.setQuantity(existingItem.getQuantity() + quantity);
                } else {
                        CartItem newItem = CartItem.builder()
                                        .cart(cart)
                                        .product(product)
                                        .quantity(quantity)
                                        .price(product.getPrice())
                                        .build();
                        cart.getItems().add(newItem);
                }

                cartRepository.save(cart);
                return convertToResponse(cart);
        }

        private Cart createNewCart(User user) {
                Cart cart = Cart.builder().user(user).build();
                return cartRepository.save(cart);
        }

        private CartResponse convertToResponse(Cart cart) {
                List<CartItemResponse> items = cart.getItems().stream()
                                .map(item -> CartItemResponse.builder()
                                                .productId(item.getProduct().getId())
                                                .productName(item.getProduct().getName())
                                                .imageUrl(item.getProduct().getImageUrl())
                                                .price(item.getPrice())
                                                .quantity(item.getQuantity())
                                                .subtotal(item.getSubtotal())
                                                .build())
                                .collect(Collectors.toList());

                return CartResponse.builder()
                                .cartId(cart.getId())
                                .userId(cart.getUser().getId())
                                .items(items)
                                .totalPrice(cart.getTotalPrice())
                                .totalItems(items.size())
                                .build();
        }

        @Transactional
        public CartResponse removeFromCart(Long productId) {
                String username = SecurityContextHolder.getContext().getAuthentication().getName();

                User user = userRepository.findByUsername(username)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

                Cart cart = cartRepository.findByUserId(user.getId())
                                .orElseThrow(() -> new RuntimeException("Giỏ hàng không tồn tại"));

                CartItem item = cart.getItems().stream()
                                .filter(i -> i.getProduct().getId().equals(productId))
                                .findFirst()
                                .orElseThrow(() -> new RuntimeException("Sản phẩm không có trong giỏ"));

                cart.getItems().remove(item);

                cartRepository.save(cart);
                return convertToResponse(cart);
        }

        @Transactional
        public CartResponse updateQuantity(Long productId, int quantity) {
                if (quantity <= 0) {
                        throw new RuntimeException("Số lượng phải > 0");
                }

                String username = SecurityContextHolder.getContext().getAuthentication().getName();

                User user = userRepository.findByUsername(username)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

                Cart cart = cartRepository.findByUserId(user.getId())
                                .orElseThrow(() -> new RuntimeException("Giỏ hàng không tồn tại"));

                CartItem item = cart.getItems().stream()
                                .filter(i -> i.getProduct().getId().equals(productId))
                                .findFirst()
                                .orElseThrow(() -> new RuntimeException("Sản phẩm không có trong giỏ"));

                Product product = item.getProduct();

                if (product.getStockQuantity() < quantity) {
                        throw new RuntimeException("Không đủ hàng trong kho");
                }

                item.setQuantity(quantity);

                cartRepository.save(cart);
                return convertToResponse(cart);
        }
}