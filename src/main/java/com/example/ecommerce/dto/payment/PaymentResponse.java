package com.example.ecommerce.dto.payment;

import com.example.ecommerce.entity.payment.PaymentMethod;
import com.example.ecommerce.entity.payment.PaymentStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentResponse {

    private Long paymentId;
    private Long orderId;
    private PaymentMethod paymentMethod;
    private PaymentStatus status;
    private BigDecimal amount;
    private String transactionId;
    private LocalDateTime paymentDate;
    private String note;
}
