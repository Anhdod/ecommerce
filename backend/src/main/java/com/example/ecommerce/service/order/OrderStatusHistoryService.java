package com.example.ecommerce.service.order;

import com.example.ecommerce.dto.order.OrderStatusHistoryResponse;
import com.example.ecommerce.entity.order.Order;
import com.example.ecommerce.entity.order.OrderStatus;
import com.example.ecommerce.entity.order.OrderStatusHistory;
import com.example.ecommerce.repository.order.OrderStatusHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class OrderStatusHistoryService {

    @Autowired
    private OrderStatusHistoryRepository orderStatusHistoryRepository;

    public void recordStatusChange(Order order, OrderStatus oldStatus, OrderStatus newStatus, String note) {
        OrderStatusHistory history = OrderStatusHistory.builder()
                .order(order)
                .oldStatus(oldStatus)
                .newStatus(newStatus)
                .changedBy(order.getUser() != null ? order.getUser().getUsername() : null)
                .note(note)
                .build();

        orderStatusHistoryRepository.save(history);
    }

    public List<OrderStatusHistoryResponse> getOrderHistory(Long orderId) {
        return orderStatusHistoryRepository.findByOrderIdOrderByChangedAtDesc(orderId).stream()
                .map(history -> OrderStatusHistoryResponse.builder()
                        .orderId(history.getOrder().getId())
                        .oldStatus(history.getOldStatus())
                        .newStatus(history.getNewStatus())
                        .changedBy(history.getChangedBy())
                        .note(history.getNote())
                        .changedAt(history.getChangedAt())
                        .build())
                .collect(Collectors.toList());
    }
}
