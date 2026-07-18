package com.example.ecommerce.repository.payment;

import com.example.ecommerce.entity.payment.Payment;
import com.example.ecommerce.entity.payment.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByOrderId(Long orderId);

    List<Payment> findByStatus(PaymentStatus status);

    List<Payment> findByStatusOrderByPaymentDateDesc(PaymentStatus status);

    List<Payment> findAllByOrderByPaymentDateDesc();

    List<Payment> findByOrder_User_Id(Long userId);
}
