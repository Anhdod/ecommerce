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
import com.example.ecommerce.dto.payment.PaymentRejectionRequest;
import com.example.ecommerce.repository.order.OrderRepository;
import com.example.ecommerce.repository.payment.PaymentRepository;
import com.example.ecommerce.repository.auth.UserRepository;
import com.example.ecommerce.service.notification.NotificationService;
import com.example.ecommerce.entity.notification.NotificationType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.Set;
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

    @Value("${upload.payment.dir:uploads/payments}")
    private String paymentUploadDir;

    private static final long MAX_PROOF_SIZE = 5 * 1024 * 1024;
    private static final Set<String> ALLOWED_PROOF_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

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

        Order order = payment.getOrder();
        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new RuntimeException("Không thể xác nhận thanh toán cho đơn đã hủy");
        }
        if (payment.getPaymentMethod() == PaymentMethod.COD) {
            if (payment.getStatus() != PaymentStatus.PENDING) {
                throw new RuntimeException("Giao dịch COD không còn ở trạng thái chờ thu tiền");
            }
            if (order.getStatus() != OrderStatus.DELIVERED) {
                throw new RuntimeException("Chỉ xác nhận COD sau khi đơn đã giao");
            }
        } else if (payment.getPaymentMethod() == PaymentMethod.BANK_TRANSFER) {
            if (payment.getStatus() != PaymentStatus.SUBMITTED || payment.getProofImageUrl() == null) {
                throw new RuntimeException("Khách hàng chưa gửi biên lai chuyển khoản");
            }
        } else {
            throw new RuntimeException("Thanh toán thẻ phải do khách hàng hoàn tất trên trang thanh toán");
        }

        payment.setStatus(PaymentStatus.PAID);
        payment.setPaymentDate(LocalDateTime.now());
        payment.setReviewedAt(LocalDateTime.now());
        payment.setRejectionReason(null);
        payment.setNote(payment.getPaymentMethod() == PaymentMethod.COD
                ? "Đã thu tiền COD"
                : "Admin đã duyệt biên lai chuyển khoản");
        paymentRepository.save(payment);

        notificationService.createNotification(order.getUser(), NotificationType.PAYMENT,
                "Thanh toán được xác nhận",
                "Thanh toán cho đơn hàng #" + order.getId() + " đã được xác nhận và đơn đang chờ xử lý.",
                "/orders/" + order.getId());

        return ApiResponse.success("Admin đã xác nhận thanh toán thành công", null);
    }

    @Transactional
    public PaymentResponse submitBankTransferProof(Long orderId, MultipartFile file) {
        validateProof(file);

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thanh toán"));

        if (!payment.getOrder().getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Không có quyền gửi biên lai cho đơn hàng này");
        }
        if (payment.getPaymentMethod() != PaymentMethod.BANK_TRANSFER) {
            throw new RuntimeException("Đơn hàng không sử dụng phương thức chuyển khoản");
        }
        if (payment.getOrder().getStatus() != OrderStatus.PENDING) {
            throw new RuntimeException("Đơn hàng không còn chờ xác nhận thanh toán");
        }
        if (payment.getStatus() != PaymentStatus.PENDING && payment.getStatus() != PaymentStatus.REJECTED) {
            throw new RuntimeException("Không thể gửi biên lai ở trạng thái hiện tại");
        }

        String previousProof = payment.getProofImageUrl();
        try {
            Path uploadPath = Paths.get(paymentUploadDir);
            Files.createDirectories(uploadPath);
            String extension = extensionFor(file.getContentType());
            String fileName = "payment_" + payment.getId() + "_" + UUID.randomUUID() + extension;
            Files.copy(file.getInputStream(), uploadPath.resolve(fileName), StandardCopyOption.REPLACE_EXISTING);

            payment.setProofImageUrl("/uploads/payments/" + fileName);
            payment.setSubmittedAt(LocalDateTime.now());
            payment.setReviewedAt(null);
            payment.setRejectionReason(null);
            payment.setStatus(PaymentStatus.SUBMITTED);
            payment.setNote("Khách hàng đã gửi biên lai chuyển khoản");
            Payment savedPayment = paymentRepository.save(payment);
            deleteProofFile(previousProof);

            notificationService.createNotification(user, NotificationType.PAYMENT,
                    "Đã gửi biên lai chuyển khoản",
                    "Biên lai cho đơn hàng #" + orderId + " đang chờ quản trị viên kiểm tra.",
                    "/orders/" + orderId);
            return convertToResponse(savedPayment);
        } catch (IOException exception) {
            throw new RuntimeException("Không thể lưu ảnh biên lai: " + exception.getMessage(), exception);
        }
    }

    @Transactional
    public ApiResponse<String> rejectBankTransferProof(Long paymentId, PaymentRejectionRequest request) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thanh toán"));
        if (payment.getPaymentMethod() != PaymentMethod.BANK_TRANSFER
                || payment.getStatus() != PaymentStatus.SUBMITTED) {
            throw new RuntimeException("Chỉ có thể từ chối biên lai đang chờ duyệt");
        }
        if (payment.getOrder().getStatus() == OrderStatus.CANCELLED) {
            throw new RuntimeException("Đơn hàng đã bị hủy");
        }

        String reason = request.getReason().trim();
        payment.setStatus(PaymentStatus.REJECTED);
        payment.setReviewedAt(LocalDateTime.now());
        payment.setRejectionReason(reason);
        payment.setNote("Biên lai bị từ chối: " + reason);
        paymentRepository.save(payment);

        notificationService.createNotification(payment.getOrder().getUser(), NotificationType.PAYMENT,
                "Biên lai chuyển khoản chưa hợp lệ",
                "Biên lai cho đơn hàng #" + payment.getOrder().getId() + " bị từ chối: " + reason,
                "/checkout/payment/" + payment.getOrder().getId());
        return ApiResponse.success("Đã từ chối biên lai và thông báo cho khách hàng", null);
    }

    @Transactional
    public PaymentResponse refundPaidPayment(Long orderId, String reason) {
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thanh toán"));
        if (payment.getStatus() != PaymentStatus.PAID) {
            throw new RuntimeException("Chỉ có thể hoàn giao dịch đã thanh toán");
        }

        String normalizedReason = reason == null ? "" : reason.trim();
        if (normalizedReason.isBlank()) {
            throw new RuntimeException("Vui lòng nhập lý do hoàn tiền");
        }

        payment.setStatus(PaymentStatus.REFUNDED);
        payment.setRefundedAt(LocalDateTime.now());
        payment.setReviewedAt(LocalDateTime.now());
        payment.setRefundReason(normalizedReason);
        payment.setNote("Đã hoàn tiền: " + normalizedReason);
        return convertToResponse(paymentRepository.save(payment));
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
            if (payment.getStatus() == PaymentStatus.PENDING
                    || payment.getStatus() == PaymentStatus.SUBMITTED
                    || payment.getStatus() == PaymentStatus.REJECTED) {
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
                .proofImageUrl(payment.getProofImageUrl())
                .submittedAt(payment.getSubmittedAt())
                .reviewedAt(payment.getReviewedAt())
                .refundedAt(payment.getRefundedAt())
                .rejectionReason(payment.getRejectionReason())
                .refundReason(payment.getRefundReason())
                .note(payment.getNote())
                .build();
    }

    private void validateProof(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Vui lòng chọn ảnh biên lai");
        }
        if (file.getSize() > MAX_PROOF_SIZE) {
            throw new RuntimeException("Ảnh biên lai không được vượt quá 5MB");
        }
        if (!ALLOWED_PROOF_TYPES.contains(file.getContentType())) {
            throw new RuntimeException("Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP");
        }
    }

    private String extensionFor(String contentType) {
        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
    }

    private void deleteProofFile(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return;
        }
        try {
            String fileName = Paths.get(imageUrl).getFileName().toString();
            Files.deleteIfExists(Paths.get(paymentUploadDir).resolve(fileName));
        } catch (IOException ignored) {
            // The new proof is already stored; an orphaned old image must not fail the request.
        }
    }
}
