package com.example.ecommerce.controller.admin;

import com.example.ecommerce.dto.ApiResponse;
import com.example.ecommerce.dto.finance.OperatingExpenseRequest;
import com.example.ecommerce.dto.finance.OperatingExpenseResponse;
import com.example.ecommerce.entity.finance.ExpenseCategory;
import com.example.ecommerce.service.finance.OperatingExpenseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin/expenses")
@PreAuthorize("hasAnyRole('ADMIN','STAFF')")
@RequiredArgsConstructor
public class AdminExpenseController {

    private final OperatingExpenseService expenseService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<OperatingExpenseResponse>>> getExpenses(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) ExpenseCategory category) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách chi phí thành công",
                expenseService.getExpenses(from, to, category)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<OperatingExpenseResponse>> create(
            @Valid @RequestBody OperatingExpenseRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Tạo chi phí thành công", expenseService.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<OperatingExpenseResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody OperatingExpenseRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật chi phí thành công",
                expenseService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        expenseService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa chi phí thành công", null));
    }
}
