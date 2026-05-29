package com.example.ecommerce.repository.products;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.ecommerce.entity.product.Category;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
}