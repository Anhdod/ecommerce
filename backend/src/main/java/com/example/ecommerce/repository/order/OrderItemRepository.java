package com.example.ecommerce.repository.order;

import com.example.ecommerce.dto.admin.TopSellingProductResponse;
import com.example.ecommerce.entity.order.OrderItem;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    @Query("select new com.example.ecommerce.dto.admin.TopSellingProductResponse(oi.product.id, oi.product.name, sum(oi.quantity), sum(oi.price * oi.quantity)) "
            +
            "from OrderItem oi group by oi.product.id, oi.product.name order by sum(oi.quantity) desc")
    List<TopSellingProductResponse> findTopSellingProducts(Pageable pageable);

    @Query("select coalesce(sum(oi.quantity), 0) from OrderItem oi where oi.product.id = :productId")
    long sumSoldQuantityByProductId(@Param("productId") Long productId);
}
