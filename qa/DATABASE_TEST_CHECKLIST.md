# Database Test Checklist - Ecommerce Project

Database mục tiêu: MySQL.

Lưu ý: tên bảng/cột có thể cần chỉnh theo schema thực tế nếu Hibernate sinh tên khác.

## User and Authentication

```sql
-- Kiểm tra user mới sau khi register
SELECT id, username, email, role, enabled
FROM users
WHERE username = 'testuser';

-- Kiểm tra role của user
SELECT username, role
FROM users
WHERE username IN ('admin', 'testuser');
```

Expected:
- User mới tồn tại.
- Role đúng theo nghiệp vụ.
- Password không lưu plain text.

## Product

```sql
-- Kiểm tra sản phẩm active
SELECT id, name, price, stock_quantity, active
FROM products
WHERE active = true;

-- Kiểm tra sản phẩm theo category
SELECT p.id, p.name, c.name AS category_name
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE c.id = 1;
```

Expected:
- Product tạo mới có category đúng.
- Product delete mềm chuyển `active = false`.

## Wishlist

```sql
-- Kiểm tra user đã like sản phẩm
SELECT *
FROM product_likes
WHERE user_id = 1 AND product_id = 1;
```

Expected:
- Sau khi like, có record trong bảng like.
- Sau khi unlike, record bị xóa hoặc trạng thái thay đổi theo thiết kế.

## Cart

```sql
-- Kiểm tra cart item sau add to cart
SELECT c.id AS cart_id, ci.product_id, ci.quantity, ci.price
FROM carts c
JOIN cart_items ci ON ci.cart_id = c.id
WHERE c.user_id = 1;
```

Expected:
- Quantity đúng sau add/update.
- Subtotal/total trên API khớp với dữ liệu item.
- Sau remove, item không còn trong cart.

## Checkout and Order

```sql
-- Kiểm tra order mới sau checkout
SELECT id, user_id, status, subtotal, discount_amount, shipping_fee, total_price, coupon_code
FROM orders
WHERE user_id = 1
ORDER BY created_at DESC;

-- Kiểm tra order items
SELECT order_id, product_id, quantity, price
FROM order_items
WHERE order_id = 1;

-- Kiểm tra payment được tạo theo order
SELECT id, order_id, amount, payment_method, status
FROM payments
WHERE order_id = 1;
```

Expected:
- Order được tạo đúng user.
- Order item khớp với cart trước checkout.
- Payment được tạo với amount đúng.
- Cart được clear sau checkout thành công.

## Inventory

```sql
-- Kiểm tra tồn kho sản phẩm
SELECT id, name, stock_quantity
FROM products
WHERE id = 1;

-- Kiểm tra lịch sử tồn kho
SELECT product_id, quantity_change, type, reason, created_at
FROM stock_movements
WHERE product_id = 1
ORDER BY created_at DESC;
```

Expected:
- Checkout làm giảm tồn kho.
- Cancel order hoàn lại tồn kho.
- Điều chỉnh tồn kho tạo stock movement.

## Coupon

```sql
-- Kiểm tra coupon
SELECT code, discount_type, discount_value, active, expires_at, usage_limit, used_count
FROM coupons
WHERE code = 'SALE10';
```

Expected:
- Coupon hợp lệ được áp dụng đúng discount.
- Coupon hết hạn/inactive không được áp dụng.
- `used_count` tăng sau checkout thành công nếu có logic mark used.
