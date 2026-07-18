package com.example.ecommerce.service.order;

import java.math.BigDecimal;
import java.util.UUID;

import com.example.ecommerce.dto.order.CheckoutRequest;
import com.example.ecommerce.dto.order.AdminOrderCostRequest;
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
import com.example.ecommerce.entity.coupon.Coupon;
import com.example.ecommerce.entity.product.Product;
import com.example.ecommerce.repository.auth.UserRepository;
import com.example.ecommerce.repository.cart.CartRepository;
import com.example.ecommerce.repository.order.OrderRepository;
import com.example.ecommerce.service.auth.AddressService;
import com.example.ecommerce.service.cart.CartService;
import com.example.ecommerce.service.payment.PaymentService;
import com.example.ecommerce.service.order.OrderStatusHistoryService;
import com.example.ecommerce.service.coupon.CouponService;
import com.example.ecommerce.dto.order.OrderStatusHistoryResponse;
import com.example.ecommerce.service.inventory.InventoryService;
import com.example.ecommerce.entity.inventory.StockMovementType;
import com.example.ecommerce.service.notification.NotificationService;
import com.example.ecommerce.entity.notification.NotificationType;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
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

    @Autowired
    private CouponService couponService;

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private NotificationService notificationService;

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

        List<CartItem> checkoutItems = getSelectedCartItems(cart, request.getCartItemIds());

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
                .trackingCode(generateTrackingCode())
                .status(OrderStatus.PENDING)
                .items(new ArrayList<>())
                .shippingMethod(shippingMethod)
                .build();

        for (CartItem cartItem : checkoutItems) {
            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .product(cartItem.getProduct())
                    .quantity(cartItem.getQuantity())
                    .price(cartItem.getPrice())
                    .costPrice(cartItem.getProduct().getCostPrice())
                    .selectedColor(cartItem.getSelectedColor())
                    .build();

            order.getItems().add(orderItem);

            Product product = cartItem.getProduct();
            inventoryService.recordMovement(
                    product,
                    -cartItem.getQuantity(),
                    StockMovementType.SALE,
                    "Order creation",
                    "Deduct stock for pending order item");
        }

        BigDecimal subtotal = order.calculateTotalPrice();
        Coupon coupon = couponService.getValidCoupon(request.getCouponCode(), subtotal);
        BigDecimal discountAmount = couponService.calculateDiscount(coupon, subtotal);
        BigDecimal shippingFee = calculateShippingFee(shippingMethod, subtotal);
        order.setSubtotal(subtotal);
        order.setDiscountAmount(discountAmount);
        order.setCouponCode(coupon != null ? coupon.getCode() : null);
        order.setShippingFee(shippingFee);
        order.setTotalPrice(subtotal.subtract(discountAmount).add(shippingFee));

        Order savedOrder = orderRepository.save(order);
        orderStatusHistoryService.recordStatusChange(savedOrder, null, savedOrder.getStatus(), "Đơn hàng được tạo");

        couponService.markUsed(coupon);
        paymentService.createPayment(savedOrder, request.getPaymentMethod());
        notificationService.createNotification(user, NotificationType.ORDER,
                "Đơn hàng đã được tạo",
                "Đơn hàng #" + savedOrder.getId() + " đang chờ xử lý.",
                "/orders/" + savedOrder.getId());

        cart.getItems().removeAll(checkoutItems);
        cartRepository.save(cart);

        return convertToResponse(savedOrder);
    }

    public OrderResponse createOrder(String shippingAddress, String phoneNumber, PaymentMethod paymentMethod) {
        List<Long> cartItemIds = cartService.getMyCart().getItems().stream()
                .map(com.example.ecommerce.dto.cart.CartItemResponse::getCartItemId)
                .toList();
        return createOrder(CheckoutRequest.builder()
                .shippingAddress(shippingAddress)
                .phoneNumber(phoneNumber)
                .paymentMethod(paymentMethod)
                .shippingMethod(ShippingMethod.STANDARD)
                .cartItemIds(cartItemIds)
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

        if (!order.getUser().getId().equals(user.getId())
                && user.getRole() != Role.ADMIN
                && user.getRole() != Role.STAFF) {
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

        if (!order.getUser().getId().equals(user.getId())
                && user.getRole() != Role.ADMIN
                && user.getRole() != Role.STAFF) {
            throw new RuntimeException("Không có quyền xem lịch sử đơn hàng này");
        }

        return orderStatusHistoryService.getOrderHistory(orderId);
    }

    public List<OrderResponse> getAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    public CheckoutPreviewResponse getCheckoutPreview(ShippingMethod shippingMethod, Long addressId,
            String couponCode, List<Long> cartItemIds) {
        if (shippingMethod == null) {
            shippingMethod = ShippingMethod.STANDARD;
        }

        CartResponse cartResponse = filterCartForCheckout(cartService.getMyCart(), cartItemIds);
        BigDecimal subtotal = cartResponse.getTotalPrice() == null ? BigDecimal.ZERO : cartResponse.getTotalPrice();
        Coupon coupon = couponService.getValidCoupon(couponCode, subtotal);
        BigDecimal discountAmount = couponService.calculateDiscount(coupon, subtotal);
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
                .couponCode(coupon != null ? coupon.getCode() : null)
                .discountAmount(discountAmount)
                .grandTotal(subtotal.subtract(discountAmount).add(shippingFee))
                .defaultShippingAddressId(defaultShippingAddressId)
                .defaultShippingAddress(defaultShippingAddress)
                .selectedShippingAddressId(addressId)
                .selectedShippingAddress(selectedShippingAddress)
                .build();
    }

    private List<CartItem> getSelectedCartItems(Cart cart, List<Long> cartItemIds) {
        if (cartItemIds == null || cartItemIds.isEmpty()) {
            throw new RuntimeException("Vui lòng chọn sản phẩm cần thanh toán");
        }

        Set<Long> selectedIds = new LinkedHashSet<>(cartItemIds);
        List<CartItem> selectedItems = cart.getItems().stream()
                .filter(item -> selectedIds.contains(item.getId()))
                .toList();
        if (selectedItems.isEmpty() || selectedItems.size() != selectedIds.size()) {
            throw new RuntimeException("Một hoặc nhiều sản phẩm đã chọn không còn trong giỏ hàng");
        }
        return selectedItems;
    }

    private CartResponse filterCartForCheckout(CartResponse cart, List<Long> cartItemIds) {
        if (cartItemIds == null || cartItemIds.isEmpty()) {
            throw new RuntimeException("Vui lòng chọn sản phẩm cần thanh toán");
        }

        Set<Long> selectedIds = new LinkedHashSet<>(cartItemIds);
        List<com.example.ecommerce.dto.cart.CartItemResponse> selectedItems = cart.getItems().stream()
                .filter(item -> selectedIds.contains(item.getCartItemId()))
                .toList();
        if (selectedItems.isEmpty() || selectedItems.size() != selectedIds.size()) {
            throw new RuntimeException("Một hoặc nhiều sản phẩm đã chọn không còn trong giỏ hàng");
        }
        BigDecimal selectedTotal = selectedItems.stream()
                .map(com.example.ecommerce.dto.cart.CartItemResponse::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return CartResponse.builder()
                .cartId(cart.getCartId())
                .userId(cart.getUserId())
                .items(selectedItems)
                .totalPrice(selectedTotal)
                .totalItems(selectedItems.size())
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
        BigDecimal discount = order.getDiscountAmount() == null ? BigDecimal.ZERO : order.getDiscountAmount();
        order.setSubtotal(subtotal);
        order.setTotalPrice(subtotal.subtract(discount)
                .add(order.getShippingFee() == null ? BigDecimal.ZERO : order.getShippingFee()));

        return convertToResponse(orderRepository.save(order));
    }

    public OrderResponse updateOrder(Long orderId, String shippingAddress, String phoneNumber) {
        return updateOrder(orderId, OrderUpdateRequest.builder()
                .shippingAddress(shippingAddress)
                .phoneNumber(phoneNumber)
                .build());
    }

    @Transactional
    public OrderResponse updateStatus(Long orderId, OrderStatus status) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng"));

        OrderStatus oldStatus = order.getStatus();
        if (oldStatus == status) {
            return convertToResponse(order);
        }
        if (status == OrderStatus.CANCELLED) {
            throw new RuntimeException("Hãy dùng chức năng hủy đơn để hoàn kho và đóng thanh toán");
        }

        OrderStatus nextStatus = switch (oldStatus) {
            case PENDING -> OrderStatus.CONFIRMED;
            case CONFIRMED -> OrderStatus.SHIPPING;
            case SHIPPING -> OrderStatus.DELIVERED;
            case DELIVERED, CANCELLED -> null;
        };
        if (nextStatus == null) {
            throw new RuntimeException("Đơn hàng đã kết thúc và không thể đổi trạng thái");
        }
        if (status != nextStatus) {
            throw new RuntimeException("Trạng thái tiếp theo hợp lệ là " + nextStatus);
        }
        if (status == OrderStatus.CONFIRMED) {
            paymentService.validateOrderConfirmation(orderId);
        }
        if (status == OrderStatus.SHIPPING
                && (order.getTrackingCode() == null || order.getTrackingCode().isBlank())) {
            throw new RuntimeException("Phải có mã vận đơn trước khi bắt đầu giao hàng");
        }

        order.setStatus(status);
        Order updatedOrder = orderRepository.save(order);
        orderStatusHistoryService.recordStatusChange(updatedOrder, oldStatus, status,
                "Admin cập nhật trạng thái đơn hàng");
        notificationService.createNotification(order.getUser(), NotificationType.ORDER,
                "Cập nhật trạng thái đơn hàng",
                "Đơn hàng #" + order.getId() + " đã chuyển sang trạng thái " + status,
                "/orders/" + order.getId());
        return convertToResponse(updatedOrder);
    }

    @Transactional
    public OrderResponse updateTrackingCode(Long orderId, String trackingCode) {
        if (trackingCode == null || trackingCode.isBlank()) {
            throw new RuntimeException("Ma van don khong duoc de trong");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Khong tim thay don hang"));

        if (order.getStatus() == OrderStatus.DELIVERED || order.getStatus() == OrderStatus.CANCELLED) {
            throw new RuntimeException("Không thể sửa mã vận đơn của đơn hàng đã kết thúc");
        }

        order.setTrackingCode(trackingCode.trim());
        Order updatedOrder = orderRepository.save(order);
        orderStatusHistoryService.recordStatusChange(updatedOrder, order.getStatus(), order.getStatus(),
                "Admin cap nhat ma van don: " + updatedOrder.getTrackingCode());
        notificationService.createNotification(order.getUser(), NotificationType.ORDER,
                "Cap nhat ma van don",
                "Don hang #" + order.getId() + " co ma van don moi: " + updatedOrder.getTrackingCode(),
                "/orders/" + order.getId());
        return convertToResponse(updatedOrder);
    }

    @Transactional
    @CacheEvict(value = { "adminDashboardSummary", "adminDashboardRevenue" }, allEntries = true)
    public OrderResponse updateOrderCosts(Long orderId, AdminOrderCostRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng"));

        if (request.getRefundAmount().compareTo(order.getTotalPrice()) > 0) {
            throw new RuntimeException("Số tiền hoàn không được lớn hơn tổng tiền đơn hàng");
        }

        order.setShippingCost(request.getShippingCost());
        order.setPackagingCost(request.getPackagingCost());
        order.setPaymentFee(request.getPaymentFee());
        order.setPlatformFee(request.getPlatformFee());
        order.setRefundAmount(request.getRefundAmount());
        return convertToResponse(orderRepository.save(order));
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

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new RuntimeException("Chỉ có thể hủy đơn đang chờ xác nhận");
        }

        if (paymentService.isOrderPaid(orderId)) {
            throw new RuntimeException("Đơn đã thanh toán, vui lòng liên hệ cửa hàng để được hoàn tiền");
        }

        cancelUnpaidOrder(order, "Người dùng hủy đơn hàng", "Đơn hàng đã được hủy theo yêu cầu của bạn.");
    }

    @Transactional
    public OrderResponse cancelOrderByAdmin(Long orderId, String reason) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng"));

        if (order.getStatus() != OrderStatus.PENDING && order.getStatus() != OrderStatus.CONFIRMED) {
            throw new RuntimeException("Admin chỉ có thể hủy đơn chờ xác nhận hoặc đã xác nhận");
        }
        if (paymentService.isOrderPaid(orderId)) {
            throw new RuntimeException("Đơn đã thanh toán; cần hoàn tiền trước khi hủy");
        }

        String normalizedReason = reason == null || reason.isBlank()
                ? "Cửa hàng hủy đơn"
                : reason.trim();
        Order cancelledOrder = cancelUnpaidOrder(
                order,
                "Admin hủy đơn: " + normalizedReason,
                "Cửa hàng đã hủy đơn. Lý do: " + normalizedReason);
        return convertToResponse(cancelledOrder);
    }

    private Order cancelUnpaidOrder(Order order, String historyReason, String customerMessage) {
        for (OrderItem item : order.getItems()) {
            Product product = item.getProduct();
            inventoryService.recordMovement(
                    product,
                    item.getQuantity(),
                    StockMovementType.RETURN,
                    "Order cancel",
                    "Restore stock after cancellation");
        }
        OrderStatus oldStatus = order.getStatus();
        order.setStatus(OrderStatus.CANCELLED);
        Order cancelledOrder = orderRepository.save(order);
        paymentService.cancelPendingPayment(order.getId());
        couponService.releaseUsage(order.getCouponCode());
        orderStatusHistoryService.recordStatusChange(cancelledOrder, oldStatus, OrderStatus.CANCELLED, historyReason);
        notificationService.createNotification(order.getUser(), NotificationType.ORDER,
                "Đơn hàng đã bị hủy",
                "Đơn hàng #" + order.getId() + ". " + customerMessage,
                "/orders/" + order.getId());
        return cancelledOrder;
    }

    @Transactional
    public OrderResponse confirmReceived(Long orderId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng"));

        if (!order.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Không có quyền xác nhận đơn này");
        }

        if (order.getStatus() != OrderStatus.SHIPPING) {
            throw new RuntimeException("Chỉ xác nhận khi đơn đang giao hàng");
        }

        OrderStatus oldStatus = order.getStatus();
        order.setStatus(OrderStatus.DELIVERED);
        Order updatedOrder = orderRepository.save(order);
        orderStatusHistoryService.recordStatusChange(updatedOrder, oldStatus, OrderStatus.DELIVERED,
                "Người dùng xác nhận đã nhận hàng");
        notificationService.createNotification(user, NotificationType.ORDER,
                "Đã xác nhận nhận hàng",
                "Đơn hàng #" + order.getId() + " đã được xác nhận hoàn tất.",
                "/orders/" + order.getId());
        return convertToResponse(updatedOrder);
    }

    private String generateTrackingCode() {
        return "TRK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    // ================= CONVERT =================
    private OrderResponse convertToResponse(Order order) {
        boolean manager = canViewFinancials();
        List<OrderItemResponse> items = order.getItems().stream()
                .map(item -> OrderItemResponse.builder()
                        .orderItemId(item.getId())
                        .productId(item.getProduct().getId())
                        .productName(item.getProduct().getName())
                        .imageUrl(item.getProduct().getImageUrl())
                        .price(item.getPrice())
                        .quantity(item.getQuantity())
                        .selectedColor(item.getSelectedColor())
                        .subtotal(item.getSubtotal())
                        .build())
                .collect(Collectors.toList());

        return OrderResponse.builder()
                .orderId(order.getId())
                .userId(order.getUser().getId())
                .items(items)
                .subtotal(order.getSubtotal() == null ? order.calculateTotalPrice() : order.getSubtotal())
                .discountAmount(order.getDiscountAmount() == null ? BigDecimal.ZERO : order.getDiscountAmount())
                .couponCode(order.getCouponCode())
                .totalPrice(order.getTotalPrice())
                .status(order.getStatus())
                .shippingMethod(order.getShippingMethod())
                .shippingFee(order.getShippingFee())
                .shippingCost(manager ? zeroIfNull(order.getShippingCost()) : null)
                .packagingCost(manager ? zeroIfNull(order.getPackagingCost()) : null)
                .paymentFee(manager ? zeroIfNull(order.getPaymentFee()) : null)
                .platformFee(manager ? zeroIfNull(order.getPlatformFee()) : null)
                .refundAmount(manager ? zeroIfNull(order.getRefundAmount()) : null)
                .costOfGoods(manager ? order.calculateCostOfGoods() : null)
                .grossProfit(manager ? order.calculateGrossProfit() : null)
                .orderProfit(manager ? order.calculateOrderProfit() : null)
                .shippingAddress(order.getShippingAddress())
                .phoneNumber(order.getPhoneNumber())
                .trackingCode(order.getTrackingCode())
                .createdAt(order.getCreatedAt())
                .build();
    }

    private boolean canViewFinancials() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.isAuthenticated()
                && authentication.getAuthorities().stream()
                        .map(authority -> authority.getAuthority())
                        .anyMatch(authority -> "ROLE_ADMIN".equals(authority) || "ROLE_STAFF".equals(authority));
    }

    private BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}


