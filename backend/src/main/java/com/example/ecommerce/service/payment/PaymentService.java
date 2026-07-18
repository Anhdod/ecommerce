package com.example.ecommerce.service.payment;

import com.example.ecommerce.dto.ApiResponse;
import com.example.ecommerce.entity.auth.User;
import com.example.ecommerce.entity.auth.Role;
import com.example.ecommerce.entity.order.Order;
import com.example.ecommerce.entity.order.OrderStatus;
import com.example.ecommerce.entity.payment.Payment;
import com.example.ecommerce.entity.payment.PaymentMethod;
import com.example.ecommerce.entity.payment.PaymentStatus;
import com.example.ecommerce.dto.payment.PaymentResponse;
import com.example.ecommerce.repository.order.OrderRepository;
import com.example.ecommerce.repository.payment.PaymentRepository;
import com.example.ecommerce.repository.auth.UserRepository;
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

        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseGet(() -> createPayment(order, paymentMethod));

        if (payment.getPaymentMethod() != paymentMethod) {
            throw new RuntimeException("Phương thức thanh toán không khớp với đơn hàng");
        }

        if (paymentMethod != PaymentMethod.MOCK_CARD) {
            throw new RuntimeException("Phương thức này không hỗ trợ thanh toán trực tuyến");
        }

        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new RuntimeException("Giao dịch không còn ở trạng thái chờ thanh toán");
        }

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new RuntimeException("Đơn hàng không ở trạng thái chờ thanh toán");
        }

        // Giả lập thanh toán thành công
        payment.setStatus(PaymentStatus.PAID);
        payment.setPaymentDate(LocalDateTime.now());
        payment.setNote("Thanh toán thành công qua " + paymentMethod.name());

        paymentRepository.save(payment);

        notificationService.createNotification(user, NotificationType.PAYMENT,
                "Thanh toán thành công",
                "Thanh toán cho đơn hàng #" + orderId + " đã hoàn tất và đang chờ cửa hàng xác nhận.",
                "/orders/" + orderId);

        return ApiResponse.success("Thanh toán thành công cho đơn hàng #" + orderId, null);
    }

    // Admin xác nhận thanh toán thủ công
    @Transactional
    public ApiResponse<String> confirmPaymentByAdmin(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thanh toán"));

        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new RuntimeException("Chỉ có thể xác nhận giao dịch đang chờ");
        }

        Order order = payment.getOrder();
        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new RuntimeException("Không thể xác nhận thanh toán cho đơn đã hủy");
        }
        if (payment.getPaymentMethod() == PaymentMethod.COD && order.getStatus() != OrderStatus.DELIVERED) {
            throw new RuntimeException("Chỉ xác nhận COD sau khi đơn đã giao");
        }
        if (payment.getPaymentMethod() == PaymentMethod.MOCK_CARD) {
            throw new RuntimeException("Thanh toán thẻ phải do khách hàng hoàn tất trên trang thanh toán");
        }

        payment.setStatus(PaymentStatus.PAID);
        payment.setPaymentDate(LocalDateTime.now());
        paymentRepository.save(payment);

        notificationService.createNotification(order.getUser(), NotificationType.PAYMENT,
                "Thanh toán được xác nhận",
                "Thanh toán cho đơn hàng #" + order.getId() + " đã được xác nhận và đơn đang chờ xử lý.",
                "/orders/" + order.getId());

        return ApiResponse.success("Admin đã xác nhận thanh toán thành công", null);
    }

    public PaymentResponse getPaymentByOrder(Long orderId) {
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin thanh toán cho đơn hàng này"));

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));
        boolean manager = user.getRole() == Role.ADMIN || user.getRole() == Role.STAFF;
        if (!manager && !payment.getOrder().getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Không có quyền xem thanh toán của đơn hàng này");
        }

        return convertToResponse(payment);
    }

    @Transactional
    public void cancelPendingPayment(Long orderId) {
        paymentRepository.findByOrderId(orderId).ifPresent(payment -> {
            if (payment.getStatus() == PaymentStatus.PENDING) {
                payment.setStatus(PaymentStatus.FAILED);
                payment.setNote("Đã đóng do đơn hàng bị hủy");
                paymentRepository.save(payment);
            }
        });
    }

    public boolean isOrderPaid(Long orderId) {
        return paymentRepository.findByOrderId(orderId)
                .map(payment -> payment.getStatus() == PaymentStatus.PAID)
                .orElse(false);
    }

    public void validateOrderConfirmation(Long orderId) {
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thanh toán của đơn hàng"));
        if (payment.getPaymentMethod() != PaymentMethod.COD && payment.getStatus() != PaymentStatus.PAID) {
            throw new RuntimeException("Đơn thanh toán online chưa được thanh toán");
        }
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
        return paymentRepository.findByStatusOrderByPaymentDateDesc(status).stream()
                .map(this::convertToResponse)
                .toList();
    }

    public java.util.List<PaymentResponse> getAllPayments() {
        return paymentRepository.findAllByOrderByPaymentDateDesc().stream()
                .map(this::convertToResponse)
                .toList();
    }

    private PaymentResponse convertToResponse(Payment payment) {
        return PaymentResponse.builder()
                .paymentId(payment.getId())
                .orderId(payment.getOrder().getId())
                .orderStatus(payment.getOrder().getStatus())
                .paymentMethod(payment.getPaymentMethod())
                .status(payment.getStatus())
                .amount(payment.getAmount())
                .transactionId(payment.getTransactionId())
                .paymentDate(payment.getPaymentDate())
                .note(payment.getNote())
                .build();
    }
}
