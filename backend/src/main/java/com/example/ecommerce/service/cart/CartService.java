package com.example.ecommerce.service.cart;

import com.example.ecommerce.dto.cart.CartItemResponse;
import com.example.ecommerce.dto.cart.CartResponse;
import com.example.ecommerce.dto.products.ProductVariantResponse;
import com.example.ecommerce.entity.auth.User;
import com.example.ecommerce.entity.cart.Cart;
import com.example.ecommerce.entity.cart.CartItem;
import com.example.ecommerce.entity.product.Product;
import com.example.ecommerce.entity.product.ProductVariant;
import com.example.ecommerce.repository.auth.UserRepository;
import com.example.ecommerce.repository.cart.CartRepository;
import com.example.ecommerce.repository.products.ProductRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
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
        public CartResponse addToCart(Long productId, int quantity, Long variantId, String selectedColor) {
                String username = SecurityContextHolder.getContext().getAuthentication().getName();
                User user = userRepository.findByUsername(username)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

                Product product = productRepository.findById(productId)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));

                ProductVariant variant = resolveVariant(product, variantId);

                if (quantity <= 0) {
                        throw new RuntimeException("Số lượng phải lớn hơn 0");
                }

                Cart cart = cartRepository.findByUserId(user.getId())
                                .orElseGet(() -> createNewCart(user));
                int quantityInCart = cart.getItems().stream()
                                .filter(item -> item.getProduct().getId().equals(productId)
                                                && sameVariant(item.getProductVariant(), variant))
                                .mapToInt(CartItem::getQuantity)
                                .sum();
                int availableStock = variant == null ? product.getStockQuantity() : variant.getStockQuantity();
                if (availableStock < quantityInCart + quantity) {
                        throw new RuntimeException("Sản phẩm không đủ tồn kho");
                }

                String normalizedColor = variant == null
                                ? normalizeSelectedColor(product, selectedColor)
                                : findColorAttribute(variant.getAttributes());

                // Mỗi màu là một dòng giỏ hàng riêng; cùng màu thì tăng số lượng.
                CartItem existingItem = cart.getItems().stream()
                                .filter(item -> item.getProduct().getId().equals(productId)
                                                && sameVariant(item.getProductVariant(), variant)
                                                && Objects.equals(item.getSelectedColor(), normalizedColor))
                                .findFirst()
                                .orElse(null);

                if (existingItem != null) {
                        existingItem.setQuantity(existingItem.getQuantity() + quantity);
                        existingItem.setProductVariant(variant);
                        existingItem.setPrice(variant == null ? product.getPrice() : variant.getPrice());
                        existingItem.setSelectedColor(normalizedColor);
                } else {
                        CartItem newItem = CartItem.builder()
                                        .cart(cart)
                                        .product(product)
                                        .productVariant(variant)
                                        .quantity(quantity)
                                        .price(variant == null ? product.getPrice() : variant.getPrice())
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
                                                .imageUrl(item.getProductVariant() != null && item.getProductVariant().getImageUrl() != null
                                                                ? item.getProductVariant().getImageUrl()
                                                                : item.getProduct().getImageUrl())
                                                .price(item.getPrice())
                                                .quantity(item.getQuantity())
                                                .selectedColor(item.getSelectedColor())
                                                .variantId(item.getProductVariant() == null ? null : item.getProductVariant().getId())
                                                .variantName(item.getProductVariant() == null ? null : item.getProductVariant().getName())
                                                .sku(item.getProductVariant() == null ? null : item.getProductVariant().getSku())
                                                .selectedAttributes(item.getProductVariant() == null
                                                                ? Map.of()
                                                                : new LinkedHashMap<>(item.getProductVariant().getAttributes()))
                                                .availableVariants(toAvailableVariants(item.getProduct()))
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
                                                && cartItem.getProduct().getId().equals(product.getId())
                                                && sameVariant(cartItem.getProductVariant(), item.getProductVariant()))
                                .mapToInt(CartItem::getQuantity)
                                .sum();
                int availableStock = item.getProductVariant() == null
                                ? product.getStockQuantity()
                                : item.getProductVariant().getStockQuantity();
                if (availableStock < otherVariantQuantity + quantity) {
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

                if (item.getProduct().getVariants() != null && item.getProduct().getVariants().stream().anyMatch(ProductVariant::isActive)) {
                        ProductVariant matchingColor = item.getProduct().getVariants().stream()
                                        .filter(ProductVariant::isActive)
                                        .filter(variant -> Objects.equals(
                                                        normalizeComparison(findColorAttribute(variant.getAttributes())),
                                                        normalizeComparison(selectedColor)))
                                        .findFirst()
                                        .orElseThrow(() -> new RuntimeException("Màu sắc không hợp lệ"));
                        return updateSelectedVariantInCart(cart, item, matchingColor);
                }

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

        @Transactional
        public CartResponse updateSelectedVariant(Long cartItemId, Long variantId) {
                String username = SecurityContextHolder.getContext().getAuthentication().getName();
                User user = userRepository.findByUsername(username)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));
                Cart cart = cartRepository.findByUserId(user.getId())
                                .orElseThrow(() -> new RuntimeException("Giỏ hàng không tồn tại"));
                CartItem item = cart.getItems().stream()
                                .filter(cartItem -> cartItem.getId().equals(cartItemId))
                                .findFirst()
                                .orElseThrow(() -> new RuntimeException("Sản phẩm không có trong giỏ"));
                ProductVariant variant = resolveVariant(item.getProduct(), variantId);
                if (variant == null) {
                        throw new RuntimeException("Biến thể không hợp lệ");
                }
                return updateSelectedVariantInCart(cart, item, variant);
        }

        private CartResponse updateSelectedVariantInCart(Cart cart, CartItem item, ProductVariant variant) {
                CartItem matchingVariant = cart.getItems().stream()
                                .filter(cartItem -> !cartItem.getId().equals(item.getId())
                                                && cartItem.getProduct().getId().equals(item.getProduct().getId())
                                                && sameVariant(cartItem.getProductVariant(), variant))
                                .findFirst()
                                .orElse(null);
                int requestedQuantity = item.getQuantity() + (matchingVariant == null ? 0 : matchingVariant.getQuantity());
                if (requestedQuantity > variant.getStockQuantity()) {
                        throw new RuntimeException("Biến thể không đủ tồn kho");
                }

                if (matchingVariant != null) {
                        matchingVariant.setQuantity(requestedQuantity);
                        matchingVariant.setPrice(variant.getPrice());
                        cart.getItems().remove(item);
                } else {
                        item.setProductVariant(variant);
                        item.setPrice(variant.getPrice());
                        item.setSelectedColor(findColorAttribute(variant.getAttributes()));
                }
                cartRepository.save(cart);
                return convertToResponse(cart);
        }

        private ProductVariant resolveVariant(Product product, Long variantId) {
                List<ProductVariant> activeVariants = product.getVariants() == null ? List.of() : product.getVariants().stream()
                                .filter(ProductVariant::isActive)
                                .toList();
                if (activeVariants.isEmpty()) {
                        if (variantId != null) {
                                throw new RuntimeException("Sản phẩm không sử dụng biến thể");
                        }
                        return null;
                }
                if (variantId == null) {
                        throw new RuntimeException("Vui lòng chọn biến thể sản phẩm");
                }
                return activeVariants.stream()
                                .filter(variant -> variant.getId().equals(variantId))
                                .findFirst()
                                .orElseThrow(() -> new RuntimeException("Biến thể không hợp lệ hoặc đã ngừng bán"));
        }

        private boolean sameVariant(ProductVariant first, ProductVariant second) {
                if (first == null || second == null) {
                        return first == null && second == null;
                }
                return Objects.equals(first.getId(), second.getId());
        }

        private List<ProductVariantResponse> toAvailableVariants(Product product) {
                if (product.getVariants() == null) {
                        return List.of();
                }
                return product.getVariants().stream()
                                .filter(ProductVariant::isActive)
                                .map(variant -> ProductVariantResponse.builder()
                                                .id(variant.getId())
                                                .sku(variant.getSku())
                                                .name(variant.getName())
                                                .attributes(new LinkedHashMap<>(variant.getAttributes()))
                                                .price(variant.getPrice())
                                                .stockQuantity(variant.getStockQuantity())
                                                .imageUrl(variant.getImageUrl())
                                                .active(true)
                                                .build())
                                .toList();
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

        private String normalizeComparison(String value) {
                return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        }
}
