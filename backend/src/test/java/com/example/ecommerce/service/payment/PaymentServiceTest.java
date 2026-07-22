package com.example.ecommerce.service.payment;

import com.example.ecommerce.dto.payment.PaymentRejectionRequest;
import com.example.ecommerce.dto.payment.PaymentResponse;
import com.example.ecommerce.entity.auth.User;
import com.example.ecommerce.entity.order.Order;
import com.example.ecommerce.entity.order.OrderStatus;
import com.example.ecommerce.entity.payment.Payment;
import com.example.ecommerce.entity.payment.PaymentMethod;
import com.example.ecommerce.entity.payment.PaymentStatus;
import com.example.ecommerce.repository.auth.UserRepository;
import com.example.ecommerce.repository.order.OrderRepository;
import com.example.ecommerce.repository.payment.PaymentRepository;
import com.example.ecommerce.service.notification.NotificationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private OrderRepository orderRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private PaymentService paymentService;

    @TempDir
    Path uploadDirectory;

    private User buyer;
    private Order order;

    @BeforeEach
    void setUp() {
        buyer = User.builder().id(7L).username("buyer").build();
        order = Order.builder()
                .id(12L)
                .user(buyer)
                .status(OrderStatus.PENDING)
                .totalPrice(new BigDecimal("250000"))
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("buyer", null)
        );
        ReflectionTestUtils.setField(paymentService, "paymentUploadDir", uploadDirectory.toString());
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void submitProofStoresImageAndMovesPaymentToSubmitted() throws Exception {
        Payment payment = bankTransfer(PaymentStatus.PENDING);
        when(userRepository.findByUsername("buyer")).thenReturn(Optional.of(buyer));
        when(paymentRepository.findByOrderId(12L)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        MockMultipartFile proof = new MockMultipartFile(
                "file", "receipt.png", "image/png", "valid-image-content".getBytes()
        );

        PaymentResponse response = paymentService.submitBankTransferProof(12L, proof);

        assertThat(response.getStatus()).isEqualTo(PaymentStatus.SUBMITTED);
        assertThat(response.getProofImageUrl()).startsWith("/uploads/payments/payment_30_").endsWith(".png");
        assertThat(payment.getSubmittedAt()).isNotNull();
        assertThat(Files.list(uploadDirectory)).hasSize(1);
        verify(paymentRepository).save(payment);
    }

    @Test
    void submitProofRejectsUserWhoDoesNotOwnOrder() {
        User anotherBuyer = User.builder().id(99L).username("buyer").build();
        when(userRepository.findByUsername("buyer")).thenReturn(Optional.of(anotherBuyer));
        when(paymentRepository.findByOrderId(12L)).thenReturn(Optional.of(bankTransfer(PaymentStatus.PENDING)));
        MockMultipartFile proof = new MockMultipartFile("file", "receipt.jpg", "image/jpeg", new byte[]{1});

        assertThatThrownBy(() -> paymentService.submitBankTransferProof(12L, proof))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không có quyền");
    }

    @Test
    void rejectSubmittedProofStoresReasonAndAllowsCustomerToResubmit() {
        Payment payment = bankTransfer(PaymentStatus.SUBMITTED);
        payment.setProofImageUrl("/uploads/payments/receipt.png");
        PaymentRejectionRequest request = new PaymentRejectionRequest();
        request.setReason("Ảnh bị mờ");
        when(paymentRepository.findById(30L)).thenReturn(Optional.of(payment));

        paymentService.rejectBankTransferProof(30L, request);

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.REJECTED);
        assertThat(payment.getRejectionReason()).isEqualTo("Ảnh bị mờ");
        assertThat(payment.getReviewedAt()).isNotNull();
        verify(paymentRepository).save(payment);
    }

    @Test
    void rejectProofRequiresSubmittedStatus() {
        Payment payment = bankTransfer(PaymentStatus.PENDING);
        PaymentRejectionRequest request = new PaymentRejectionRequest();
        request.setReason("Không hợp lệ");
        when(paymentRepository.findById(30L)).thenReturn(Optional.of(payment));

        assertThatThrownBy(() -> paymentService.rejectBankTransferProof(30L, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("đang chờ duyệt");
    }

    @Test
    void confirmSubmittedBankTransferMarksPaymentPaid() {
        Payment payment = bankTransfer(PaymentStatus.SUBMITTED);
        payment.setProofImageUrl("/uploads/payments/receipt.png");
        when(paymentRepository.findById(30L)).thenReturn(Optional.of(payment));

        paymentService.confirmPaymentByAdmin(30L);

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(payment.getPaymentDate()).isNotNull();
        assertThat(payment.getReviewedAt()).isNotNull();
        verify(paymentRepository).save(payment);
    }

    @Test
    void confirmBankTransferFailsBeforeCustomerSubmitsProof() {
        Payment payment = bankTransfer(PaymentStatus.PENDING);
        when(paymentRepository.findById(30L)).thenReturn(Optional.of(payment));

        assertThatThrownBy(() -> paymentService.confirmPaymentByAdmin(30L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("chưa gửi biên lai");
    }

    @Test
    void refundPaidPaymentStoresReasonAndRefundTime() {
        Payment payment = bankTransfer(PaymentStatus.PAID);
        when(paymentRepository.findByOrderId(12L)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(payment)).thenReturn(payment);

        PaymentResponse response = paymentService.refundPaidPayment(12L, "Khách yêu cầu hủy");

        assertThat(response.getStatus()).isEqualTo(PaymentStatus.REFUNDED);
        assertThat(response.getRefundReason()).isEqualTo("Khách yêu cầu hủy");
        assertThat(response.getRefundedAt()).isNotNull();
        verify(paymentRepository).save(payment);
    }

    @Test
    void refundRejectsPaymentThatIsNotPaid() {
        Payment payment = bankTransfer(PaymentStatus.PENDING);
        when(paymentRepository.findByOrderId(12L)).thenReturn(Optional.of(payment));

        assertThatThrownBy(() -> paymentService.refundPaidPayment(12L, "Hủy đơn"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("đã thanh toán");
    }

    private Payment bankTransfer(PaymentStatus status) {
        return Payment.builder()
                .id(30L)
                .order(order)
                .paymentMethod(PaymentMethod.BANK_TRANSFER)
                .status(status)
                .amount(order.getTotalPrice())
                .transactionId("TX-TEST")
                .build();
    }
}
