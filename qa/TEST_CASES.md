# Manual Test Cases - Ecommerce Project

## Authentication

| TC ID | Module | Scenario | Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|
| AUTH_001 | Login | Login thành công với tài khoản hợp lệ | 1. Mở trang login 2. Nhập username/password 3. Click Login | User hợp lệ | Đăng nhập thành công, hiển thị menu theo role | High |
| AUTH_002 | Login | Login thất bại với sai mật khẩu | 1. Mở trang login 2. Nhập username đúng, password sai 3. Click Login | Password sai | Hiển thị thông báo lỗi, không lưu token | High |
| AUTH_003 | Register | Đăng ký tài khoản mới thành công | 1. Mở form register 2. Nhập thông tin hợp lệ 3. Submit | Username/email mới | Tạo tài khoản thành công | Medium |
| AUTH_004 | Authorization | User thường truy cập trang admin | 1. Login user thường 2. Mở URL admin | User role USER | Bị chặn hoặc không hiển thị chức năng admin | High |

## Product

| TC ID | Module | Scenario | Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|
| PROD_001 | Product List | Xem danh sách sản phẩm | 1. Mở trang chủ/sản phẩm | Có product active | Hiển thị danh sách sản phẩm active | High |
| PROD_002 | Product Search | Tìm kiếm sản phẩm theo keyword | 1. Nhập keyword 2. Click Search | Keyword tồn tại | Chỉ hiển thị sản phẩm phù hợp | Medium |
| PROD_003 | Product Filter | Lọc theo khoảng giá | 1. Nhập min/max price 2. Apply filter | Min/max hợp lệ | Danh sách chỉ gồm sản phẩm trong khoảng giá | Medium |
| PROD_004 | Product Sort | Sắp xếp giá tăng dần | 1. Chọn sort Price low to high | Có nhiều sản phẩm | Sản phẩm được sắp xếp đúng theo giá | Medium |
| PROD_005 | Product Detail | Xem chi tiết sản phẩm | 1. Click Details trên product | Product active | Hiển thị tên, giá, stock, rating, review | High |

## Wishlist

| TC ID | Module | Scenario | Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|
| WISH_001 | Wishlist | User chưa login mở wishlist | 1. Logout 2. Mở trang Wishlist | Không có token | Hiển thị yêu cầu đăng nhập | High |
| WISH_002 | Wishlist | Xem wishlist khi đã login | 1. Login 2. Mở Wishlist | User hợp lệ | Hiển thị danh sách sản phẩm đã like hoặc empty state | High |
| WISH_003 | Wishlist | Xóa sản phẩm khỏi wishlist | 1. Mở Wishlist 2. Click Remove from wishlist | Product đã like | Sản phẩm bị xóa khỏi danh sách wishlist | High |
| WISH_004 | Wishlist | Thêm sản phẩm vào wishlist từ detail | 1. Login 2. Mở product detail 3. Click Like | Product active | Like count/isLiked cập nhật đúng | Medium |

## Cart

| TC ID | Module | Scenario | Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|
| CART_001 | Cart | Add to cart khi chưa login | 1. Logout 2. Click Add to cart | Product active | Hiển thị yêu cầu đăng nhập | High |
| CART_002 | Cart | Add to cart thành công | 1. Login 2. Click Add to cart 3. Mở Cart | Product còn hàng | Sản phẩm xuất hiện trong giỏ hàng | High |
| CART_003 | Cart | Cập nhật số lượng hợp lệ | 1. Mở Cart 2. Nhập quantity mới 3. Update | Quantity <= stock | Quantity, subtotal, total cập nhật đúng | High |
| CART_004 | Cart | Cập nhật số lượng vượt tồn kho | 1. Mở Cart 2. Nhập quantity lớn hơn stock 3. Update | Quantity > stock | Hiển thị lỗi không đủ hàng | High |
| CART_005 | Cart | Xóa sản phẩm khỏi giỏ hàng | 1. Mở Cart 2. Click Remove | Item trong cart | Item bị xóa, total cập nhật | High |

## Checkout and Order

| TC ID | Module | Scenario | Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|
| CHK_001 | Checkout | Preview checkout với địa chỉ hợp lệ | 1. Login 2. Có item trong cart 3. Chọn address 4. Preview | Address hợp lệ | Hiển thị subtotal, shipping fee, grand total | High |
| CHK_002 | Checkout | Áp dụng coupon hợp lệ | 1. Nhập coupon 2. Preview | Coupon còn hạn | Discount được tính đúng | Medium |
| CHK_003 | Checkout | Áp dụng coupon sai | 1. Nhập coupon sai 2. Preview | Coupon không tồn tại | Hiển thị lỗi hoặc không áp dụng discount | Medium |
| CHK_004 | Checkout | Checkout thành công | 1. Có item trong cart 2. Chọn address/payment 3. Submit checkout | Cart hợp lệ | Tạo order, tạo payment, cart được clear | Critical |
| ORD_001 | Order | Xem danh sách đơn hàng của user | 1. Login 2. Mở Orders | User có order | Chỉ hiển thị order của user hiện tại | High |
| ORD_002 | Order | Xem chi tiết đơn hàng | 1. Mở Orders 2. Click detail | Order hợp lệ | Hiển thị item, total, status, payment info | High |
| ORD_003 | Order | Hủy đơn ở trạng thái cho phép | 1. Mở order pending 2. Click Cancel | Order PENDING | Status chuyển CANCELLED, stock được hoàn | High |
| ORD_004 | Order | Không cho hủy đơn đã giao | 1. Mở order DELIVERED 2. Click Cancel | Order DELIVERED | Hiển thị lỗi không thể hủy | High |

## Admin

| TC ID | Module | Scenario | Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|
| ADM_001 | Admin Product | Admin tạo sản phẩm mới | 1. Login admin 2. Mở Product Admin 3. Nhập data 4. Save | Product data hợp lệ | Product được tạo và xuất hiện ở danh sách | High |
| ADM_002 | Admin Product | Admin cập nhật sản phẩm | 1. Chọn product 2. Sửa giá/stock 3. Save | Product tồn tại | Dữ liệu product cập nhật đúng | High |
| ADM_003 | Admin Category | Admin tạo category | 1. Mở Categories 2. Nhập data 3. Save | Category mới | Category được tạo thành công | Medium |
| ADM_004 | Admin User | Admin đổi role user | 1. Mở Users 2. Chọn role mới 3. Save | User tồn tại | Role user cập nhật đúng | High |
| ADM_005 | Admin Review | Admin ẩn review | 1. Mở Reviews 2. Click Hide | Review tồn tại | Review bị hidden trên trang product | Medium |
| ADM_006 | Inventory | Điều chỉnh tồn kho | 1. Mở Inventory 2. Chọn product 3. Nhập adjustment 4. Submit | Product tồn tại | Stock thay đổi, có stock movement | High |

## Payment

| TC ID | Module | Scenario | Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|
| PAY_001 | Payment | User xem payment của mình | 1. Login user 2. Mở Payments | User có payment | Chỉ hiển thị payment của user | Medium |
| PAY_002 | Payment | Admin xem danh sách payment | 1. Login admin 2. Mở Payments admin | Admin account | Hiển thị danh sách payment theo filter | Medium |
| PAY_003 | Payment | Admin xác nhận payment | 1. Chọn payment pending 2. Click Confirm | Payment pending | Payment status cập nhật đúng | High |
