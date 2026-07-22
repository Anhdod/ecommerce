package com.example.ecommerce.controller.payment;

import com.example.ecommerce.dto.ApiResponse;
import com.example.ecommerce.dto.payment.PaymentRejectionRequest;
import com.example.ecommerce.dto.payment.PaymentResponse;
import com.example.ecommerce.entity.payment.PaymentMethod;
import com.example.ecommerce.entity.payment.PaymentStatus;
import com.example.ecommerce.service.payment.PaymentService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    // User thực hiện thanh toán cho đơn hàng
    // POST /api/payments/order/5?paymentMethod=MOCK_CARD

    @PostMapping("/order/{orderId}")
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<String>> processPayment(
            @PathVariable Long orderId,
            @RequestParam PaymentMethod paymentMethod) {

        ApiResponse<String> response = paymentService.processPayment(orderId, paymentMethod);
        return ResponseEntity.ok(response);
    }

    // Admin xác nhận thanh toán thủ công (nếu cần)
    // PUT /api/payments/admin/confirm/10

    @PutMapping("/admin/confirm/{paymentId}")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<String>> confirmPaymentByAdmin(@PathVariable Long paymentId) {
        ApiResponse<String> response = paymentService.confirmPaymentByAdmin(paymentId);
        return ResponseEntity.ok(response);
    }

    @PostMapping(value = "/order/{orderId}/proof", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<PaymentResponse>> submitBankTransferProof(
            @PathVariable Long orderId,
            @RequestParam("file") MultipartFile file) {
        PaymentResponse response = paymentService.submitBankTransferProof(orderId, file);
        return ResponseEntity.ok(ApiResponse.success("Đã gửi biên lai chuyển khoản", response));
    }

    @PutMapping("/admin/reject/{paymentId}")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<String>> rejectBankTransferProof(
            @PathVariable Long paymentId,
            @Valid @RequestBody PaymentRejectionRequest request) {
        return ResponseEntity.ok(paymentService.rejectBankTransferProof(paymentId, request));
    }

    @GetMapping("/order/{orderId}")
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPaymentByOrder(@PathVariable Long orderId) {
        PaymentResponse response = paymentService.getPaymentByOrder(orderId);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin thanh toán thành công", response));
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<java.util.List<PaymentResponse>>> getMyPayments() {
        java.util.List<PaymentResponse> list = paymentService.getMyPayments();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách thanh toán của bạn thành công", list));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<java.util.List<PaymentResponse>>> getPaymentsByStatus(
            @RequestParam(required = false) PaymentStatus status) {
        java.util.List<PaymentResponse> list;
        if (status == null) {
            list = paymentService.getAllPayments();
        } else {
            list = paymentService.getPaymentsByStatus(status);
        }
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách thanh toán thành công", list));
    }
}

