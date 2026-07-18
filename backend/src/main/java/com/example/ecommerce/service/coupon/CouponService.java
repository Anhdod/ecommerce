package com.example.ecommerce.service.coupon;

import com.example.ecommerce.dto.coupon.CouponPreviewResponse;
import com.example.ecommerce.dto.coupon.CouponRequest;
import com.example.ecommerce.dto.coupon.CouponResponse;
import com.example.ecommerce.entity.coupon.Coupon;
import com.example.ecommerce.entity.coupon.DiscountType;
import com.example.ecommerce.repository.coupon.CouponRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class CouponService {

    @Autowired
    private CouponRepository couponRepository;

    public List<CouponResponse> getAllCoupons() {
        return couponRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public CouponResponse getCoupon(Long id) {
        return toResponse(couponRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Khong tim thay coupon")));
    }

    @Transactional
    public CouponResponse createCoupon(CouponRequest request) {
        String code = normalizeCode(request.getCode());
        if (couponRepository.existsByCodeIgnoreCase(code)) {
            throw new RuntimeException("Ma giam gia da ton tai");
        }

        Coupon coupon = Coupon.builder()
                .code(code)
                .description(request.getDescription())
                .discountType(request.getDiscountType())
                .discountValue(request.getDiscountValue())
                .minOrderAmount(request.getMinOrderAmount() == null ? BigDecimal.ZERO : request.getMinOrderAmount())
                .maxDiscountAmount(request.getMaxDiscountAmount())
                .usageLimit(request.getUsageLimit())
                .active(request.getActive() == null || request.getActive())
                .expiresAt(request.getExpiresAt())
                .build();

        return toResponse(couponRepository.save(coupon));
    }

    @Transactional
    public CouponResponse updateCoupon(Long id, CouponRequest request) {
        Coupon coupon = couponRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Khong tim thay coupon"));

        String code = normalizeCode(request.getCode());
        if (!coupon.getCode().equalsIgnoreCase(code) && couponRepository.existsByCodeIgnoreCase(code)) {
            throw new RuntimeException("Ma giam gia da ton tai");
        }

        coupon.setCode(code);
        coupon.setDescription(request.getDescription());
        coupon.setDiscountType(request.getDiscountType());
        coupon.setDiscountValue(request.getDiscountValue());
        coupon.setMinOrderAmount(request.getMinOrderAmount() == null ? BigDecimal.ZERO : request.getMinOrderAmount());
        coupon.setMaxDiscountAmount(request.getMaxDiscountAmount());
        coupon.setUsageLimit(request.getUsageLimit());
        coupon.setActive(request.getActive() == null || request.getActive());
        coupon.setExpiresAt(request.getExpiresAt());

        return toResponse(couponRepository.save(coupon));
    }

    @Transactional
    public void deleteCoupon(Long id) {
        Coupon coupon = couponRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Khong tim thay coupon"));
        coupon.setActive(false);
        couponRepository.save(coupon);
    }

    public CouponPreviewResponse previewDiscount(String code, BigDecimal subtotal) {
        Coupon coupon = getValidCoupon(code, subtotal);
        BigDecimal discountAmount = calculateDiscount(coupon, subtotal);
        return CouponPreviewResponse.builder()
                .code(coupon != null ? coupon.getCode() : null)
                .subtotal(subtotal)
                .discountAmount(discountAmount)
                .totalAfterDiscount(subtotal.subtract(discountAmount).max(BigDecimal.ZERO))
                .build();
    }

    public Coupon getValidCoupon(String code, BigDecimal subtotal) {
        if (code == null || code.isBlank()) {
            return null;
        }

        Coupon coupon = couponRepository.findByCodeIgnoreCase(normalizeCode(code))
                .orElseThrow(() -> new RuntimeException("Ma giam gia khong ton tai"));

        if (!coupon.isActive()) {
            throw new RuntimeException("Ma giam gia da bi tat");
        }
        if (coupon.getExpiresAt() != null && coupon.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Ma giam gia da het han");
        }
        if (coupon.getUsageLimit() != null && coupon.getUsedCount() >= coupon.getUsageLimit()) {
            throw new RuntimeException("Ma giam gia da het luot su dung");
        }
        if (coupon.getMinOrderAmount() != null && subtotal.compareTo(coupon.getMinOrderAmount()) < 0) {
            throw new RuntimeException("Don hang chua dat gia tri toi thieu de dung ma");
        }

        return coupon;
    }

    public BigDecimal calculateDiscount(Coupon coupon, BigDecimal subtotal) {
        if (coupon == null || subtotal == null || subtotal.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal discount = coupon.getDiscountType() == DiscountType.PERCENT
                ? subtotal.multiply(coupon.getDiscountValue()).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP)
                : coupon.getDiscountValue();

        if (coupon.getMaxDiscountAmount() != null) {
            discount = discount.min(coupon.getMaxDiscountAmount());
        }

        return discount.min(subtotal).max(BigDecimal.ZERO);
    }

    @Transactional
    public void markUsed(Coupon coupon) {
        if (coupon == null) {
            return;
        }
        coupon.setUsedCount(coupon.getUsedCount() + 1);
        couponRepository.save(coupon);
    }

    @Transactional
    public void releaseUsage(String couponCode) {
        if (couponCode == null || couponCode.isBlank()) {
            return;
        }
        couponRepository.findByCodeIgnoreCase(couponCode).ifPresent(coupon -> {
            coupon.setUsedCount(Math.max(0, coupon.getUsedCount() - 1));
            couponRepository.save(coupon);
        });
    }

    private String normalizeCode(String code) {
        return code == null ? null : code.trim().toUpperCase();
    }

    private CouponResponse toResponse(Coupon coupon) {
        return CouponResponse.builder()
                .id(coupon.getId())
                .code(coupon.getCode())
                .description(coupon.getDescription())
                .discountType(coupon.getDiscountType())
                .discountValue(coupon.getDiscountValue())
                .minOrderAmount(coupon.getMinOrderAmount())
                .maxDiscountAmount(coupon.getMaxDiscountAmount())
                .usageLimit(coupon.getUsageLimit())
                .usedCount(coupon.getUsedCount())
                .active(coupon.isActive())
                .expiresAt(coupon.getExpiresAt())
                .createdAt(coupon.getCreatedAt())
                .build();
    }
}
