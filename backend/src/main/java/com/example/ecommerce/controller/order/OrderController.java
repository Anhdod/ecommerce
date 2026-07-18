package com.example.ecommerce.controller.order;

import com.example.ecommerce.dto.ApiResponse;
import com.example.ecommerce.dto.order.CheckoutPreviewResponse;
import com.example.ecommerce.dto.order.AdminOrderCostRequest;
import com.example.ecommerce.dto.order.CheckoutRequest;
import com.example.ecommerce.dto.order.OrderResponse;
import com.example.ecommerce.dto.order.OrderStatusHistoryResponse;
import com.example.ecommerce.dto.order.OrderUpdateRequest;
import com.example.ecommerce.entity.order.OrderStatus;
import com.example.ecommerce.entity.order.ShippingMethod;
import com.example.ecommerce.entity.payment.PaymentMethod;
import com.example.ecommerce.service.order.OrderService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

        @Autowired
        private OrderService orderService;

        // POST /api/orders?shippingAddress=123
        // ABC&phoneNumber=0123456789&paymentMethod=MOCK_CARD

        @PostMapping
        @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
        public ResponseEntity<ApiResponse<OrderResponse>> createOrder(
                        @RequestParam String shippingAddress,
                        @RequestParam String phoneNumber,
                        @RequestParam PaymentMethod paymentMethod) {

                OrderResponse order = orderService.createOrder(shippingAddress, phoneNumber, paymentMethod);

                return ResponseEntity.ok(
                                ApiResponse.success("Tạo đơn hàng và Payment thành công", order));
        }

        @PostMapping("/checkout")
        @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
        public ResponseEntity<ApiResponse<OrderResponse>> checkout(
                        @Valid @RequestBody CheckoutRequest request) {
                OrderResponse order = orderService.createOrder(request);
                return ResponseEntity.ok(
                                ApiResponse.success("Checkout thành công", order));
        }

        @GetMapping("/checkout-preview")
        @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
        public ResponseEntity<ApiResponse<CheckoutPreviewResponse>> getCheckoutPreview(
                        @RequestParam(required = false) ShippingMethod shippingMethod,
                        @RequestParam(required = false) Long addressId,
                        @RequestParam(required = false) String couponCode,
                        @RequestParam(required = false) List<Long> cartItemIds) {
                return ResponseEntity.ok(
                                ApiResponse.success("Lấy preview checkout thành công",
                                                orderService.getCheckoutPreview(shippingMethod, addressId,
                                                                couponCode, cartItemIds)));
        }

        @GetMapping
        @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
        public ResponseEntity<ApiResponse<List<OrderResponse>>> getMyOrders() {
                return ResponseEntity.ok(
                                ApiResponse.success("Lấy danh sách đơn hàng thành công",
                                                orderService.getMyOrders()));
        }

        @GetMapping("/{orderId}")
        @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
        public ResponseEntity<ApiResponse<OrderResponse>> getOrderById(@PathVariable Long orderId) {
                return ResponseEntity.ok(
                                ApiResponse.success("Lấy chi tiết đơn hàng thành công",
                                                orderService.getOrderById(orderId)));
        }

        @GetMapping("/{orderId}/history")
        @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
        public ResponseEntity<ApiResponse<List<OrderStatusHistoryResponse>>> getOrderHistory(
                        @PathVariable Long orderId) {
                return ResponseEntity.ok(
                                ApiResponse.success("Lấy lịch sử đơn hàng thành công",
                                                orderService.getOrderHistory(orderId)));
        }

        @GetMapping("/admin")
        @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
        public ResponseEntity<ApiResponse<List<OrderResponse>>> getAllOrders() {
                return ResponseEntity.ok(
                                ApiResponse.success("Lấy danh sách đơn hàng admin thành công",
                                                orderService.getAllOrders()));
        }

        @PutMapping("/{orderId}")
        @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
        public ResponseEntity<ApiResponse<OrderResponse>> updateOrder(
                        @PathVariable Long orderId,
                        @RequestParam String shippingAddress,
                        @RequestParam String phoneNumber) {

                return ResponseEntity.ok(
                                ApiResponse.success("Cập nhật đơn hàng thành công",
                                                orderService.updateOrder(orderId, shippingAddress, phoneNumber)));
        }

        @PutMapping("/{orderId}/details")
        @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
        public ResponseEntity<ApiResponse<OrderResponse>> updateOrderDetails(
                        @PathVariable Long orderId,
                        @Valid @RequestBody OrderUpdateRequest request) {

                return ResponseEntity.ok(
                                ApiResponse.success("Cập nhật đơn hàng thành công",
                                                orderService.updateOrder(orderId, request)));
        }

        @PutMapping("/{id}/status")
        @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
        public ResponseEntity<ApiResponse<OrderResponse>> updateStatus(
                        @PathVariable Long id,
                        @RequestParam OrderStatus status) {

                return ResponseEntity.ok(
                                ApiResponse.success("Cập nhật trạng thái đơn hàng thành công",
                                                orderService.updateStatus(id, status)));
        }

        @PutMapping("/{id}/tracking")
        @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
        public ResponseEntity<ApiResponse<OrderResponse>> updateTrackingCode(
                        @PathVariable Long id,
                        @RequestParam String trackingCode) {

                return ResponseEntity.ok(
                                ApiResponse.success("Cap nhat ma van don thanh cong",
                                                orderService.updateTrackingCode(id, trackingCode)));
        }

        @PutMapping("/{id}/costs")
        @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
        public ResponseEntity<ApiResponse<OrderResponse>> updateOrderCosts(
                        @PathVariable Long id,
                        @Valid @RequestBody AdminOrderCostRequest request) {
                return ResponseEntity.ok(
                                ApiResponse.success("Cập nhật chi phí đơn hàng thành công",
                                                orderService.updateOrderCosts(id, request)));
        }

        @DeleteMapping("/{orderId}")
        @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
        public ResponseEntity<ApiResponse<Void>> cancelOrder(@PathVariable Long orderId) {
                orderService.cancelOrder(orderId);
                return ResponseEntity.ok(
                                ApiResponse.success("Hủy đơn hàng thành công", null));
        }

        @PutMapping("/{orderId}/admin-cancel")
        @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
        public ResponseEntity<ApiResponse<OrderResponse>> cancelOrderByAdmin(
                        @PathVariable Long orderId,
                        @RequestParam(required = false) String reason) {
                return ResponseEntity.ok(
                                ApiResponse.success("Admin hủy đơn hàng thành công",
                                                orderService.cancelOrderByAdmin(orderId, reason)));
        }

        @PutMapping("/{orderId}/confirm-received")
        @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
        public ResponseEntity<ApiResponse<OrderResponse>> confirmReceived(@PathVariable Long orderId) {
                return ResponseEntity.ok(
                                ApiResponse.success("Xác nhận đã nhận hàng thành công",
                                                orderService.confirmReceived(orderId)));
        }
}

