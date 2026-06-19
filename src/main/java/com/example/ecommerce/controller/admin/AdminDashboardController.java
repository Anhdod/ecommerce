package com.example.ecommerce.controller.admin;

import com.example.ecommerce.dto.ApiResponse;
import com.example.ecommerce.dto.admin.AdminDashboardResponse;
import com.example.ecommerce.dto.admin.OrderStatusStatResponse;
import com.example.ecommerce.dto.admin.RevenuePointResponse;
import com.example.ecommerce.dto.admin.TopCustomerResponse;
import com.example.ecommerce.dto.admin.TopSellingProductResponse;
import com.example.ecommerce.service.admin.AdminDashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin/dashboard")
public class AdminDashboardController {

    @Autowired
    private AdminDashboardService dashboardService;

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<AdminDashboardResponse>> getSummary() {
        AdminDashboardResponse summary = dashboardService.getDashboardSummary();
        return ResponseEntity.ok(ApiResponse.success("Admin dashboard fetched successfully", summary));
    }

    @GetMapping("/top-selling")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<List<TopSellingProductResponse>>> getTopSelling(
            @RequestParam(required = false, defaultValue = "5") int limit) {
        return ResponseEntity.ok(ApiResponse.success("Top selling products fetched successfully",
                dashboardService.getTopSelling(limit)));
    }

    @GetMapping("/revenue")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<List<RevenuePointResponse>>> getRevenueTimeline(
            @RequestParam(defaultValue = "day") String groupBy,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.success("Revenue timeline fetched successfully",
                dashboardService.getRevenueTimeline(groupBy, from, to)));
    }

    @GetMapping("/order-status")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<List<OrderStatusStatResponse>>> getOrderStatusStats() {
        return ResponseEntity.ok(ApiResponse.success("Order status stats fetched successfully",
                dashboardService.getOrderStatusStats()));
    }

    @GetMapping("/top-customers")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<List<TopCustomerResponse>>> getTopCustomers(
            @RequestParam(required = false, defaultValue = "5") int limit) {
        return ResponseEntity.ok(ApiResponse.success("Top customers fetched successfully",
                dashboardService.getTopCustomers(limit)));
    }
}
