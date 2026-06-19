package com.example.ecommerce.repository.order;

import com.example.ecommerce.dto.admin.TopCustomerResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.example.ecommerce.entity.order.Order;
import com.example.ecommerce.entity.order.OrderStatus;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);

    long countByStatus(OrderStatus status);

    @Query("""
            select new com.example.ecommerce.dto.admin.TopCustomerResponse(
                o.user.id,
                o.user.username,
                o.user.fullName,
                count(o.id),
                sum(o.totalPrice)
            )
            from Order o
            where o.status <> com.example.ecommerce.entity.order.OrderStatus.CANCELLED
            group by o.user.id, o.user.username, o.user.fullName
            order by sum(o.totalPrice) desc, count(o.id) desc
            """)
    List<TopCustomerResponse> findTopCustomers(Pageable pageable);
}
