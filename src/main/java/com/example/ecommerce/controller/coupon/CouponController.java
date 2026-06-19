package com.example.ecommerce.controller.coupon;

import com.example.ecommerce.dto.ApiResponse;
import com.example.ecommerce.dto.coupon.CouponPreviewResponse;
import com.example.ecommerce.dto.coupon.CouponRequest;
import com.example.ecommerce.dto.coupon.CouponResponse;
import com.example.ecommerce.service.coupon.CouponService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/coupons")
public class CouponController {

    @Autowired
    private CouponService couponService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<List<CouponResponse>>> getAllCoupons() {
        return ResponseEntity.ok(ApiResponse.success("Lay danh sach coupon thanh cong", couponService.getAllCoupons()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<CouponResponse>> getCoupon(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Lay coupon thanh cong", couponService.getCoupon(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<CouponResponse>> createCoupon(@Valid @RequestBody CouponRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Tao coupon thanh cong", couponService.createCoupon(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<CouponResponse>> updateCoupon(
            @PathVariable Long id,
            @Valid @RequestBody CouponRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Cap nhat coupon thanh cong", couponService.updateCoupon(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<Void>> deleteCoupon(@PathVariable Long id) {
        couponService.deleteCoupon(id);
        return ResponseEntity.ok(ApiResponse.success("Tat coupon thanh cong", null));
    }

    @GetMapping("/preview")
    @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
    public ResponseEntity<ApiResponse<CouponPreviewResponse>> previewCoupon(
            @RequestParam String code,
            @RequestParam BigDecimal subtotal) {
        return ResponseEntity.ok(
                ApiResponse.success("Ap dung coupon thanh cong", couponService.previewDiscount(code, subtotal)));
    }
}
