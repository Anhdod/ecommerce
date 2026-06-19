# API Test Checklist - Ecommerce Project

Base URL đề xuất: `http://localhost:8080`

## Authentication

| ID | Method | Endpoint | Case | Expected |
|---|---|---|---|---|
| API_AUTH_001 | POST | `/auth/login` | Login đúng username/password | Status 200, response có token/user |
| API_AUTH_002 | POST | `/auth/login` | Login sai password | Status 400/401, response báo lỗi |
| API_AUTH_003 | POST | `/auth/register` | Register data hợp lệ | Status 200, tạo user mới |
| API_AUTH_004 | GET | `/api/users/me` | Không gửi token | Status 401/403 |
| API_AUTH_005 | GET | `/api/users/me` | Gửi token hợp lệ | Status 200, trả thông tin user |

## Product

| ID | Method | Endpoint | Case | Expected |
|---|---|---|---|---|
| API_PROD_001 | GET | `/api/products` | Lấy danh sách sản phẩm | Status 200, data.content là array |
| API_PROD_002 | GET | `/api/products?keyword=abc` | Search keyword | Status 200, data phù hợp keyword |
| API_PROD_003 | GET | `/api/products/{id}` | Product tồn tại | Status 200, data.id đúng |
| API_PROD_004 | GET | `/api/products/{id}` | Product không tồn tại | Status 400/404, có message lỗi |
| API_PROD_005 | POST | `/api/products` | User thường tạo product | Status 403 |
| API_PROD_006 | POST | `/api/products` | Admin tạo product hợp lệ | Status 200, product được tạo |

## Wishlist

| ID | Method | Endpoint | Case | Expected |
|---|---|---|---|---|
| API_WISH_001 | POST | `/api/products/{id}/like` | Like product khi đã login | Status 200, trạng thái like thay đổi |
| API_WISH_002 | POST | `/api/products/{id}/like` | Like product không token | Status 401/403 |
| API_WISH_003 | GET | `/api/products/wishlist` | Lấy wishlist của user | Status 200, data là array |

## Cart

| ID | Method | Endpoint | Case | Expected |
|---|---|---|---|---|
| API_CART_001 | GET | `/api/cart` | Lấy cart khi đã login | Status 200, có cartId/items |
| API_CART_002 | POST | `/api/cart/add/{productId}?quantity=1` | Add product còn hàng | Status 200, item xuất hiện |
| API_CART_003 | PUT | `/api/cart/update/{productId}?quantity=2` | Update quantity hợp lệ | Status 200, quantity cập nhật |
| API_CART_004 | PUT | `/api/cart/update/{productId}?quantity=0` | Quantity không hợp lệ | Status 400, có message lỗi |
| API_CART_005 | DELETE | `/api/cart/remove/{productId}` | Remove item | Status 200, item bị xóa |

## Checkout and Order

| ID | Method | Endpoint | Case | Expected |
|---|---|---|---|---|
| API_CHK_001 | GET | `/api/orders/checkout-preview` | Preview checkout | Status 200, có subtotal/shippingFee/grandTotal |
| API_CHK_002 | POST | `/api/orders/checkout` | Checkout hợp lệ | Status 200, tạo order/payment |
| API_CHK_003 | POST | `/api/orders/checkout` | Checkout cart rỗng | Status 400, báo cart rỗng |
| API_ORD_001 | GET | `/api/orders/me` | Lấy order của user | Status 200, chỉ trả order của user |
| API_ORD_002 | GET | `/api/orders/{id}` | User xem order của mình | Status 200 |
| API_ORD_003 | GET | `/api/orders/{id}` | User xem order của người khác | Status 400/403 |
| API_ORD_004 | DELETE | `/api/orders/{id}` | Hủy order pending | Status 200, status CANCELLED |

## Admin

| ID | Method | Endpoint | Case | Expected |
|---|---|---|---|---|
| API_ADM_001 | GET | `/api/users/admin` | Admin lấy danh sách user | Status 200 |
| API_ADM_002 | GET | `/api/users/admin` | User thường gọi API admin | Status 403 |
| API_ADM_003 | PUT | `/api/users/admin/{id}/role?role=STAFF` | Admin đổi role | Status 200, role cập nhật |
| API_ADM_004 | GET | `/api/admin/dashboard/summary` | Admin xem dashboard | Status 200, có summary |
| API_ADM_005 | GET | `/api/inventory/low-stock?threshold=5` | Xem sản phẩm tồn kho thấp | Status 200 |

## Postman notes

- Tạo environment:
  - `baseUrl = http://localhost:8080`
  - `token = <JWT token sau login>`
- Với API cần đăng nhập, thêm header:
  - `Authorization: Bearer {{token}}`
  - `Content-Type: application/json`
- Sau login, dùng script Postman để lưu token nếu response có token:

```js
const json = pm.response.json();
if (json.data && json.data.token) {
  pm.environment.set('token', json.data.token);
}
```
