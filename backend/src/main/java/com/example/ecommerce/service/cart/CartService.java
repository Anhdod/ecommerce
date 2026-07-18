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
import java.util.Objects;
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
        public CartResponse addToCart(Long productId, int quantity, String selectedColor) {
                String username = SecurityContextHolder.getContext().getAuthentication().getName();
                User user = userRepository.findByUsername(username)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

                Product product = productRepository.findById(productId)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));

                if (quantity <= 0) {
                        throw new RuntimeException("Số lượng phải lớn hơn 0");
                }

                Cart cart = cartRepository.findByUserId(user.getId())
                                .orElseGet(() -> createNewCart(user));
                int quantityInCart = cart.getItems().stream()
                                .filter(item -> item.getProduct().getId().equals(productId))
                                .mapToInt(CartItem::getQuantity)
                                .sum();
                if (product.getStockQuantity() < quantityInCart + quantity) {
                        throw new RuntimeException("Sản phẩm không đủ tồn kho");
                }

                String normalizedColor = normalizeSelectedColor(product, selectedColor);

                // Mỗi màu là một dòng giỏ hàng riêng; cùng màu thì tăng số lượng.
                CartItem existingItem = cart.getItems().stream()
                                .filter(item -> item.getProduct().getId().equals(productId)
                                                && Objects.equals(item.getSelectedColor(), normalizedColor))
                                .findFirst()
                                .orElse(null);

                if (existingItem != null) {
                        existingItem.setQuantity(existingItem.getQuantity() + quantity);
                        existingItem.setSelectedColor(normalizedColor);
                } else {
                        CartItem newItem = CartItem.builder()
                                        .cart(cart)
                                        .product(product)
                                        .quantity(quantity)
                                        .price(product.getPrice())
                                        .selectedColor(normalizedColor)
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
                                                .cartItemId(item.getId())
                                                .productId(item.getProduct().getId())
                                                .productName(item.getProduct().getName())
                                                .imageUrl(item.getProduct().getImageUrl())
                                                .price(item.getPrice())
                                                .quantity(item.getQuantity())
                                                .selectedColor(item.getSelectedColor())
                                                .availableColors(item.getProduct().getColors() == null
                                                                ? List.of()
                                                                : List.copyOf(item.getProduct().getColors()))
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

        private String normalizeSelectedColor(Product product, String selectedColor) {
                if (product.getColors() == null || product.getColors().isEmpty()) {
                        return null;
                }
                if (selectedColor == null || selectedColor.isBlank()) {
                        throw new RuntimeException("Vui lòng chọn màu sắc");
                }
                return product.getColors().stream()
                                .filter(color -> color.equalsIgnoreCase(selectedColor.trim()))
                                .findFirst()
                                .orElseThrow(() -> new RuntimeException("Màu sắc không hợp lệ"));
        }

        @Transactional
        public CartResponse removeFromCart(Long cartItemId) {
                String username = SecurityContextHolder.getContext().getAuthentication().getName();

                User user = userRepository.findByUsername(username)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

                Cart cart = cartRepository.findByUserId(user.getId())
                                .orElseThrow(() -> new RuntimeException("Giỏ hàng không tồn tại"));

                CartItem item = cart.getItems().stream()
                                .filter(i -> i.getId().equals(cartItemId))
                                .findFirst()
                                .orElseThrow(() -> new RuntimeException("Sản phẩm không có trong giỏ"));

                cart.getItems().remove(item);

                cartRepository.save(cart);
                return convertToResponse(cart);
        }

        @Transactional
        public CartResponse updateQuantity(Long cartItemId, int quantity) {
                if (quantity <= 0) {
                        throw new RuntimeException("Số lượng phải > 0");
                }

                String username = SecurityContextHolder.getContext().getAuthentication().getName();

                User user = userRepository.findByUsername(username)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

                Cart cart = cartRepository.findByUserId(user.getId())
                                .orElseThrow(() -> new RuntimeException("Giỏ hàng không tồn tại"));

                CartItem item = cart.getItems().stream()
                                .filter(i -> i.getId().equals(cartItemId))
                                .findFirst()
                                .orElseThrow(() -> new RuntimeException("Sản phẩm không có trong giỏ"));

                Product product = item.getProduct();

                int otherVariantQuantity = cart.getItems().stream()
                                .filter(cartItem -> !cartItem.getId().equals(cartItemId)
                                                && cartItem.getProduct().getId().equals(product.getId()))
                                .mapToInt(CartItem::getQuantity)
                                .sum();
                if (product.getStockQuantity() < otherVariantQuantity + quantity) {
                        throw new RuntimeException("Không đủ hàng trong kho");
                }

                item.setQuantity(quantity);

                cartRepository.save(cart);
                return convertToResponse(cart);
        }

        @Transactional
        public CartResponse updateSelectedColor(Long cartItemId, String selectedColor) {
                String username = SecurityContextHolder.getContext().getAuthentication().getName();
                User user = userRepository.findByUsername(username)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));
                Cart cart = cartRepository.findByUserId(user.getId())
                                .orElseThrow(() -> new RuntimeException("Giỏ hàng không tồn tại"));
                CartItem item = cart.getItems().stream()
                                .filter(cartItem -> cartItem.getId().equals(cartItemId))
                                .findFirst()
                                .orElseThrow(() -> new RuntimeException("Sản phẩm không có trong giỏ"));

                String normalizedColor = normalizeSelectedColor(item.getProduct(), selectedColor);
                CartItem matchingVariant = cart.getItems().stream()
                                .filter(cartItem -> !cartItem.getId().equals(cartItemId)
                                                && cartItem.getProduct().getId().equals(item.getProduct().getId())
                                                && Objects.equals(cartItem.getSelectedColor(), normalizedColor))
                                .findFirst()
                                .orElse(null);
                if (matchingVariant != null) {
                        matchingVariant.setQuantity(matchingVariant.getQuantity() + item.getQuantity());
                        cart.getItems().remove(item);
                } else {
                        item.setSelectedColor(normalizedColor);
                }
                cartRepository.save(cart);
                return convertToResponse(cart);
        }
}
