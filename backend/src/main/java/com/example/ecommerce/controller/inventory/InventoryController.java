package com.example.ecommerce.controller.inventory;

import com.example.ecommerce.dto.ApiResponse;
import com.example.ecommerce.dto.inventory.StockAdjustmentRequest;
import com.example.ecommerce.dto.inventory.StockMovementResponse;
import com.example.ecommerce.dto.inventory.StockOverviewResponse;
import com.example.ecommerce.service.inventory.InventoryService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    @Autowired
    private InventoryService inventoryService;

    @GetMapping("/low-stock")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<Page<StockOverviewResponse>>> getLowStock(
            @RequestParam(defaultValue = "10") int threshold,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<StockOverviewResponse> result = inventoryService.getLowStockProducts(threshold, page, size);
        return ResponseEntity.ok(ApiResponse.success("Lay san pham ton kho thap thanh cong", result));
    }

    @GetMapping("/movements")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<Page<StockMovementResponse>>> getMovements(
            @RequestParam(required = false) Long productId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lay lich su stock thanh cong",
                inventoryService.getRecentMovements(productId, page, size)));
    }

    @PostMapping("/adjust/{productId}")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<StockMovementResponse>> adjustStock(
            @PathVariable Long productId,
            @Valid @RequestBody StockAdjustmentRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Dieu chinh stock thanh cong",
                inventoryService.adjustStock(productId, request)));
    }
}
