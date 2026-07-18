package com.example.ecommerce.service.finance;

import com.example.ecommerce.dto.finance.OperatingExpenseRequest;
import com.example.ecommerce.dto.finance.OperatingExpenseResponse;
import com.example.ecommerce.entity.finance.ExpenseCategory;
import com.example.ecommerce.entity.finance.OperatingExpense;
import com.example.ecommerce.repository.finance.OperatingExpenseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OperatingExpenseService {

    private final OperatingExpenseRepository expenseRepository;

    @Transactional(readOnly = true)
    public List<OperatingExpenseResponse> getExpenses(LocalDate from, LocalDate to, ExpenseCategory category) {
        return expenseRepository.findAllByOrderByExpenseDateDescCreatedAtDesc().stream()
                .filter(expense -> from == null || !expense.getExpenseDate().isBefore(from))
                .filter(expense -> to == null || !expense.getExpenseDate().isAfter(to))
                .filter(expense -> category == null || expense.getCategory() == category)
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    @CacheEvict(value = { "adminDashboardSummary", "adminDashboardRevenue" }, allEntries = true)
    public OperatingExpenseResponse create(OperatingExpenseRequest request) {
        OperatingExpense expense = OperatingExpense.builder()
                .category(request.getCategory())
                .amount(request.getAmount())
                .description(request.getDescription().trim())
                .expenseDate(request.getExpenseDate())
                .createdBy(SecurityContextHolder.getContext().getAuthentication().getName())
                .build();
        return toResponse(expenseRepository.save(expense));
    }

    @Transactional
    @CacheEvict(value = { "adminDashboardSummary", "adminDashboardRevenue" }, allEntries = true)
    public OperatingExpenseResponse update(Long id, OperatingExpenseRequest request) {
        OperatingExpense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chi phí"));
        expense.setCategory(request.getCategory());
        expense.setAmount(request.getAmount());
        expense.setDescription(request.getDescription().trim());
        expense.setExpenseDate(request.getExpenseDate());
        return toResponse(expenseRepository.save(expense));
    }

    @Transactional
    @CacheEvict(value = { "adminDashboardSummary", "adminDashboardRevenue" }, allEntries = true)
    public void delete(Long id) {
        if (!expenseRepository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy chi phí");
        }
        expenseRepository.deleteById(id);
    }

    private OperatingExpenseResponse toResponse(OperatingExpense expense) {
        return OperatingExpenseResponse.builder()
                .id(expense.getId())
                .category(expense.getCategory())
                .amount(expense.getAmount())
                .description(expense.getDescription())
                .expenseDate(expense.getExpenseDate())
                .createdBy(expense.getCreatedBy())
                .createdAt(expense.getCreatedAt())
                .build();
    }
}
