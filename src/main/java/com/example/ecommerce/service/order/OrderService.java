package com.example.ecommerce.service.order;

import java.math.BigDecimal;

import com.example.ecommerce.dto.order.CheckoutRequest;
import com.example.ecommerce.dto.order.OrderItemResponse;
import com.example.ecommerce.dto.order.OrderResponse;
import com.example.ecommerce.dto.order.OrderUpdateRequest;
import com.example.ecommerce.dto.cart.CartResponse;
import com.example.ecommerce.dto.order.CheckoutPreviewResponse;
import com.example.ecommerce.entity.auth.Address;
import com.example.ecommerce.entity.auth.User;
import com.example.ecommerce.entity.cart.Cart;
import com.example.ecommerce.entity.cart.CartItem;
import com.example.ecommerce.entity.order.Order;
import com.example.ecommerce.entity.order.OrderItem;
import com.example.ecommerce.entity.order.OrderStatus;
import com.example.ecommerce.entity.order.ShippingMethod;
import com.example.ecommerce.entity.payment.PaymentMethod;
import com.example.ecommerce.entity.auth.Role;
import com.example.ecommerce.entity.product.Product;
import com.example.ecommerce.repository.auth.UserRepository;
import com.example.ecommerce.repository.cart.CartRepository;
import com.example.ecommerce.repository.order.OrderRepository;
import com.example.ecommerce.service.auth.AddressService;
import com.example.ecommerce.service.cart.CartService;
import com.example.ecommerce.service.payment.PaymentService;
import com.example.ecommerce.service.order.OrderStatusHistoryService;
import com.example.ecommerce.dto.order.OrderStatusHistoryResponse;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CartService cartService;

    @Autowired
    private AddressService addressService;

    @Autowired
    private PaymentService paymentService; // ← Quan trọng: Inject PaymentService

    @Autowired
    private OrderStatusHistoryService orderStatusHistoryService;

    // ================= CREATE ORDER + PAYMENT =================
    @Transactional
    public OrderResponse createOrder(CheckoutRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

        Cart cart = cartRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Giỏ hàng trống"));

        if (cart.getItems().isEmpty()) {
            throw new RuntimeException("Giỏ hàng trống");
        }

        Address selectedAddress = null;
        if (request.getAddressId() != null) {
            selectedAddress = addressService.getAddressEntityById(request.getAddressId());
        }

        String shippingAddress = request.getShippingAddress();
        if ((shippingAddress == null || shippingAddress.isBlank()) && selectedAddress != null) {
            shippingAddress = buildFullAddress(selectedAddress);
        }
        if (shippingAddress == null || shippingAddress.isBlank()) {
            Address defaultAddress = addressService.getDefaultAddressEntity();
            if (defaultAddress != null) {
                shippingAddress = buildFullAddress(defaultAddress);
            }
        }
        if (shippingAddress == null || shippingAddress.isBlank()) {
            shippingAddress = user.getAddress();
        }

        if (shippingAddress == null || shippingAddress.isBlank()) {
            throw new RuntimeException("Phải cung cấp địa chỉ giao hàng");
        }

        String phoneNumber = request.getPhoneNumber();
        if ((phoneNumber == null || phoneNumber.isBlank()) && selectedAddress != null) {
            phoneNumber = selectedAddress.getPhoneNumber();
        }
        if (phoneNumber == null || phoneNumber.isBlank()) {
            throw new RuntimeException("Phải cung cấp số điện thoại người nhận");
        }

        ShippingMethod shippingMethod = request.getShippingMethod() != null
                ? request.getShippingMethod()
                : ShippingMethod.STANDARD;

        Order order = Order.builder()
                .user(user)
                .shippingAddress(shippingAddress)
                .phoneNumber(phoneNumber)
                .status(OrderStatus.PENDING)
                .items(new ArrayList<>())
                .shippingMethod(shippingMethod)
                .build();

        for (CartItem cartItem : cart.getItems()) {
            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .product(cartItem.getProduct())
                    .quantity(cartItem.getQuantity())
                    .price(cartItem.getPrice())
                    .build();

            order.getItems().add(orderItem);

            Product product = cartItem.getProduct();
            if (product.getStockQuantity() < cartItem.getQuantity()) {
                throw new RuntimeException("Sản phẩm không đủ tồn kho: " + product.getName());
            }
            product.setStockQuantity(product.getStockQuantity() - cartItem.getQuantity());
        }

        BigDecimal subtotal = order.calculateTotalPrice();
        BigDecimal shippingFee = calculateShippingFee(shippingMethod, subtotal);
        order.setShippingFee(shippingFee);
        order.setTotalPrice(subtotal.add(shippingFee));

        Order savedOrder = orderRepository.save(order);
        orderStatusHistoryService.recordStatusChange(savedOrder, null, savedOrder.getStatus(), "Đơn hàng được tạo");

        paymentService.createPayment(savedOrder, request.getPaymentMethod());

        cart.getItems().clear();
        cartRepository.save(cart);

        return convertToResponse(savedOrder);
    }

    public OrderResponse createOrder(String shippingAddress, String phoneNumber, PaymentMethod paymentMethod) {
        return createOrder(CheckoutRequest.builder()
                .shippingAddress(shippingAddress)
                .phoneNumber(phoneNumber)
                .paymentMethod(paymentMethod)
                .shippingMethod(ShippingMethod.STANDARD)
                .build());
    }

    private BigDecimal calculateShippingFee(ShippingMethod shippingMethod, BigDecimal subtotal) {
        if (shippingMethod == null) {
            shippingMethod = ShippingMethod.STANDARD;
        }

        if (subtotal.compareTo(new BigDecimal("500000")) >= 0) {
            return BigDecimal.ZERO;
        }

        return switch (shippingMethod) {
            case EXPRESS -> new BigDecimal("30000");
            default -> new BigDecimal("15000");
        };
    }

    // ================= GET MY ORDERS =================
    public List<OrderResponse> getMyOrders() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

        return orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    public OrderResponse getOrderById(Long orderId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng"));

        if (!order.getUser().getId().equals(user.getId()) && user.getRole() != Role.ADMIN) {
            throw new RuntimeException("Không có quyền xem đơn hàng này");
        }

        return convertToResponse(order);
    }

    public List<OrderStatusHistoryResponse> getOrderHistory(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng"));

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

        if (!order.getUser().getId().equals(user.getId()) && user.getRole() != Role.ADMIN) {
            throw new RuntimeException("Không có quyền xem lịch sử đơn hàng này");
        }

        return orderStatusHistoryService.getOrderHistory(orderId);
    }

    public List<OrderResponse> getAllOrders() {
        return orderRepository.findAll().stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    public CheckoutPreviewResponse getCheckoutPreview(ShippingMethod shippingMethod, Long addressId) {
        if (shippingMethod == null) {
            shippingMethod = ShippingMethod.STANDARD;
        }

        CartResponse cartResponse = cartService.getMyCart();
        BigDecimal subtotal = cartResponse.getTotalPrice() == null ? BigDecimal.ZERO : cartResponse.getTotalPrice();
        BigDecimal shippingFee = calculateShippingFee(shippingMethod, subtotal);

        Address defaultAddress = addressService.getDefaultAddressEntity();
        String defaultShippingAddress = defaultAddress != null ? buildFullAddress(defaultAddress) : null;
        Long defaultShippingAddressId = defaultAddress != null ? defaultAddress.getId() : null;

        if (defaultShippingAddress == null) {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));
            defaultShippingAddress = user.getAddress();
        }

        Address selectedAddress = null;
        String selectedShippingAddress = null;
        if (addressId != null) {
            selectedAddress = addressService.getAddressEntityById(addressId);
            selectedShippingAddress = buildFullAddress(selectedAddress);
        }

        return CheckoutPreviewResponse.builder()
                .cart(cartResponse)
                .shippingMethod(shippingMethod)
                .shippingFee(shippingFee)
                .subtotal(subtotal)
                .grandTotal(subtotal.add(shippingFee))
                .defaultShippingAddressId(defaultShippingAddressId)
                .defaultShippingAddress(defaultShippingAddress)
                .selectedShippingAddressId(addressId)
                .selectedShippingAddress(selectedShippingAddress)
                .build();
    }

    private String buildFullAddress(Address address) {
        StringBuilder sb = new StringBuilder();
        if (address.getAddressLine() != null) {
            sb.append(address.getAddressLine());
        }
        if (address.getCity() != null && !address.getCity().isBlank()) {
            if (sb.length() > 0)
                sb.append(", ");
            sb.append(address.getCity());
        }
        if (address.getProvince() != null && !address.getProvince().isBlank()) {
            if (sb.length() > 0)
                sb.append(", ");
            sb.append(address.getProvince());
        }
        if (address.getPostalCode() != null && !address.getPostalCode().isBlank()) {
            if (sb.length() > 0)
                sb.append(" - ");
            sb.append(address.getPostalCode());
        }
        return sb.toString();
    }

    // ================= UPDATE =================
    @Transactional
    public OrderResponse updateOrder(Long orderId, OrderUpdateRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng"));

        if (!order.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Không có quyền sửa");
        }

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new RuntimeException("Chỉ sửa khi PENDING");
        }

        if (request.getShippingAddress() != null && !request.getShippingAddress().isBlank()) {
            order.setShippingAddress(request.getShippingAddress());
        }

        if (request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()) {
            order.setPhoneNumber(request.getPhoneNumber());
        }

        if (request.getShippingMethod() != null) {
            order.setShippingMethod(request.getShippingMethod());
            order.setShippingFee(calculateShippingFee(order.getShippingMethod(), order.calculateTotalPrice()));
        }

        BigDecimal subtotal = order.calculateTotalPrice();
        order.setTotalPrice(subtotal.add(order.getShippingFee() == null ? BigDecimal.ZERO : order.getShippingFee()));

        return convertToResponse(orderRepository.save(order));
    }

    public OrderResponse updateOrder(Long orderId, String shippingAddress, String phoneNumber) {
        return updateOrder(orderId, OrderUpdateRequest.builder()
                .shippingAddress(shippingAddress)
                .phoneNumber(phoneNumber)
                .build());
    }

    public OrderResponse updateStatus(Long orderId, OrderStatus status) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng"));

        OrderStatus oldStatus = order.getStatus();
        order.setStatus(status);
        Order updatedOrder = orderRepository.save(order);
        orderStatusHistoryService.recordStatusChange(updatedOrder, oldStatus, status,
                "Admin cập nhật trạng thái đơn hàng");
        return convertToResponse(updatedOrder);
    }

    // ================= CANCEL =================
    @Transactional
    public void cancelOrder(Long orderId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng"));

        if (!order.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Không có quyền hủy đơn này");
        }

        if (order.getStatus() == OrderStatus.SHIPPING ||
                order.getStatus() == OrderStatus.DELIVERED ||
                order.getStatus() == OrderStatus.CANCELLED) {

            throw new RuntimeException("Không thể hủy đơn ở trạng thái này");
        }

        // Hoàn lại stock
        for (OrderItem item : order.getItems()) {
            Product product = item.getProduct();
            product.setStockQuantity(product.getStockQuantity() + item.getQuantity());
        }

        OrderStatus oldStatus = order.getStatus();
        order.setStatus(OrderStatus.CANCELLED);
        Order cancelledOrder = orderRepository.save(order);
        orderStatusHistoryService.recordStatusChange(cancelledOrder, oldStatus, OrderStatus.CANCELLED,
                "Người dùng hủy đơn hàng");
    }

    // ================= CONVERT =================
    private OrderResponse convertToResponse(Order order) {
        List<OrderItemResponse> items = order.getItems().stream()
                .map(item -> OrderItemResponse.builder()
                        .productId(item.getProduct().getId())
                        .productName(item.getProduct().getName())
                        .imageUrl(item.getProduct().getImageUrl())
                        .price(item.getPrice())
                        .quantity(item.getQuantity())
                        .subtotal(item.getSubtotal())
                        .build())
                .collect(Collectors.toList());

        return OrderResponse.builder()
                .orderId(order.getId())
                .userId(order.getUser().getId())
                .items(items)
                .totalPrice(order.getTotalPrice())
                .status(order.getStatus())
                .shippingMethod(order.getShippingMethod())
                .shippingFee(order.getShippingFee())
                .shippingAddress(order.getShippingAddress())
                .phoneNumber(order.getPhoneNumber())
                .createdAt(order.getCreatedAt())
                .build();
    }
}