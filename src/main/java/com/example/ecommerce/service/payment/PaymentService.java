package com.example.ecommerce.service.payment;

import com.example.ecommerce.dto.ApiResponse;
import com.example.ecommerce.entity.auth.User;
import com.example.ecommerce.entity.order.Order;
import com.example.ecommerce.entity.order.OrderStatus;
import com.example.ecommerce.entity.payment.Payment;
import com.example.ecommerce.entity.payment.PaymentMethod;
import com.example.ecommerce.entity.payment.PaymentStatus;
import com.example.ecommerce.dto.payment.PaymentResponse;
import com.example.ecommerce.repository.order.OrderRepository;
import com.example.ecommerce.repository.payment.PaymentRepository;
import com.example.ecommerce.repository.auth.UserRepository;
import com.example.ecommerce.service.order.OrderStatusHistoryService;
import com.example.ecommerce.service.notification.NotificationService;
import com.example.ecommerce.entity.notification.NotificationType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class PaymentService {

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrderStatusHistoryService orderStatusHistoryService;

    @Autowired
    private NotificationService notificationService;

    // Tạo Payment khi tạo đơn hàng (gọi từ OrderService)
    @Transactional
    public Payment createPayment(Order order, PaymentMethod paymentMethod) {
        Payment payment = Payment.builder()
                .order(order)
                .paymentMethod(paymentMethod)
                .amount(order.getTotalPrice())
                .status(PaymentStatus.PENDING)
                .transactionId("TX-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .note("Thanh toán cho đơn hàng #" + order.getId())
                .build();

        return paymentRepository.save(payment);
    }

    // User xác nhận thanh toán (giả lập)
    @Transactional
    public ApiResponse<String> processPayment(Long orderId, PaymentMethod paymentMethod) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng"));

        if (!order.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Không có quyền thanh toán đơn hàng này");
        }

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new RuntimeException("Đơn hàng không ở trạng thái chờ thanh toán");
        }

        // Tìm hoặc tạo Payment
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseGet(() -> createPayment(order, paymentMethod));

        // Giả lập thanh toán thành công
        payment.setStatus(PaymentStatus.PAID);
        payment.setPaymentDate(LocalDateTime.now());
        payment.setNote("Thanh toán thành công qua " + paymentMethod.name());

        paymentRepository.save(payment);

        // Cập nhật trạng thái đơn hàng
        order.setStatus(OrderStatus.CONFIRMED);
        orderRepository.save(order);
        orderStatusHistoryService.recordStatusChange(order, OrderStatus.PENDING, OrderStatus.CONFIRMED,
                "Thanh toán thành công");
        notificationService.createNotification(user, NotificationType.PAYMENT,
                "Thanh toán thành công",
                "Thanh toán cho đơn hàng #" + orderId + " đã hoàn tất.",
                "/orders/" + orderId);

        return ApiResponse.success("Thanh toán thành công cho đơn hàng #" + orderId, null);
    }

    // Admin xác nhận thanh toán thủ công
    @Transactional
    public ApiResponse<String> confirmPaymentByAdmin(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thanh toán"));

        if (payment.getStatus() == PaymentStatus.PAID) {
            throw new RuntimeException("Thanh toán đã được xác nhận trước đó");
        }

        payment.setStatus(PaymentStatus.PAID);
        payment.setPaymentDate(LocalDateTime.now());
        paymentRepository.save(payment);

        Order order = payment.getOrder();
        order.setStatus(OrderStatus.CONFIRMED);
        orderRepository.save(order);
        orderStatusHistoryService.recordStatusChange(order, OrderStatus.PENDING, OrderStatus.CONFIRMED,
                "Admin xác nhận thanh toán");
        notificationService.createNotification(order.getUser(), NotificationType.PAYMENT,
                "Thanh toán được xác nhận",
                "Thanh toán cho đơn hàng #" + order.getId() + " đã được xác nhận.",
                "/orders/" + order.getId());

        return ApiResponse.success("Admin đã xác nhận thanh toán thành công", null);
    }

    public PaymentResponse getPaymentByOrder(Long orderId) {
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin thanh toán cho đơn hàng này"));

        return convertToResponse(payment);
    }

    public java.util.List<PaymentResponse> getMyPayments() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

        return paymentRepository.findByOrder_User_Id(user.getId()).stream()
                .map(this::convertToResponse)
                .toList();
    }

    public java.util.List<PaymentResponse> getPaymentsByStatus(PaymentStatus status) {
        return paymentRepository.findByStatus(status).stream()
                .map(this::convertToResponse)
                .toList();
    }

    private PaymentResponse convertToResponse(Payment payment) {
        return PaymentResponse.builder()
                .paymentId(payment.getId())
                .orderId(payment.getOrder().getId())
                .paymentMethod(payment.getPaymentMethod())
                .status(payment.getStatus())
                .amount(payment.getAmount())
                .transactionId(payment.getTransactionId())
                .paymentDate(payment.getPaymentDate())
                .note(payment.getNote())
                .build();
    }
}
