package com.example.ecommerce.controller.cart;

import com.example.ecommerce.dto.ApiResponse;
import com.example.ecommerce.dto.cart.CartResponse;
import com.example.ecommerce.service.cart.CartService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    @Autowired
    private CartService cartService;

    // Lấy giỏ hàng của tôi
    @GetMapping
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<CartResponse>> getMyCart() {
        CartResponse cart = cartService.getMyCart();
        return ResponseEntity.ok(ApiResponse.success("Lấy giỏ hàng thành công", cart));
    }

    // Thêm sản phẩm vào giỏ hàng
    @PostMapping("/add/{productId}")
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<CartResponse>> addToCart(
            @PathVariable Long productId,
            @RequestParam(defaultValue = "1") int quantity) {

        CartResponse cart = cartService.addToCart(productId, quantity);
        return ResponseEntity.ok(ApiResponse.success("Thêm vào giỏ hàng thành công", cart));
    }

    @DeleteMapping("/remove/{productId}")
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<CartResponse>> removeFromCart(
            @PathVariable Long productId) {

        return ResponseEntity.ok(
                ApiResponse.success("Xóa khỏi giỏ hàng thành công",
                        cartService.removeFromCart(productId)));
    }

    @PutMapping("/update/{productId}")
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<CartResponse>> updateQuantity(
            @PathVariable Long productId,
            @RequestParam int quantity) {

        return ResponseEntity.ok(
                ApiResponse.success("Cập nhật số lượng thành công",
                        cartService.updateQuantity(productId, quantity)));
    }
}
