package com.example.ecommerce.controller.admin;

import com.example.ecommerce.dto.ApiResponse;
import com.example.ecommerce.dto.admin.AdminDashboardResponse;
import com.example.ecommerce.service.admin.AdminDashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/dashboard")
public class AdminDashboardController {

    @Autowired
    private AdminDashboardService dashboardService;

    @GetMapping("/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AdminDashboardResponse>> getSummary() {
        AdminDashboardResponse summary = dashboardService.getDashboardSummary();
        return ResponseEntity.ok(ApiResponse.success("Lấy dashboard admin thành công", summary));
    }

    @GetMapping("/top-selling")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<java.util.List<com.example.ecommerce.dto.admin.TopSellingProductResponse>>> getTopSelling(
            @RequestParam(required = false, defaultValue = "5") int limit) {
        java.util.List<com.example.ecommerce.dto.admin.TopSellingProductResponse> top = dashboardService
                .getTopSelling(limit);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách sản phẩm bán chạy thành công", top));
    }
}
