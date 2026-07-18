package com.example.ecommerce.repository.finance;

import com.example.ecommerce.entity.finance.OperatingExpense;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OperatingExpenseRepository extends JpaRepository<OperatingExpense, Long> {
    List<OperatingExpense> findAllByOrderByExpenseDateDescCreatedAtDesc();
}
