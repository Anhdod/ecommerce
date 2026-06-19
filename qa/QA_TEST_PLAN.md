# QA Test Plan - Ecommerce Project

## 1. Mục tiêu kiểm thử

Đảm bảo các chức năng chính của hệ thống ecommerce hoạt động đúng theo luồng nghiệp vụ: đăng nhập, quản lý sản phẩm, giỏ hàng, wishlist, checkout, đơn hàng, thanh toán, quản trị và tồn kho.

## 2. Phạm vi kiểm thử

In scope:
- Authentication: đăng ký, đăng nhập, đăng xuất, phân quyền.
- Product: xem danh sách, tìm kiếm, lọc, chi tiết sản phẩm.
- Wishlist: thêm/xóa sản phẩm yêu thích.
- Cart: thêm sản phẩm, cập nhật số lượng, xóa sản phẩm.
- Checkout: chọn địa chỉ, mã giảm giá, phí ship, tạo đơn hàng.
- Order: xem danh sách, xem chi tiết, hủy đơn, xác nhận nhận hàng.
- Payment: xem thanh toán, xử lý thanh toán, admin xác nhận.
- Admin: quản lý sản phẩm, danh mục, người dùng, coupon, banner, review, tồn kho.
- API testing: kiểm tra response status, data, validation, permission.
- Database testing: kiểm tra dữ liệu sau thao tác chính.

Out of scope:
- Performance testing tải lớn.
- Security testing chuyên sâu như penetration testing.
- Cross-browser testing đầy đủ trên nhiều thiết bị thật.

## 3. Loại kiểm thử

- Smoke testing: kiểm tra nhanh hệ thống chạy được.
- Functional testing: kiểm tra từng chức năng theo yêu cầu.
- UI testing: kiểm tra hiển thị và thao tác màn hình.
- API testing: kiểm tra endpoint backend bằng Postman.
- Database testing: kiểm tra dữ liệu trong MySQL.
- Regression testing: kiểm tra lại chức năng chính sau khi sửa lỗi.
- Negative testing: nhập sai dữ liệu, thiếu dữ liệu, không có quyền.

## 4. Môi trường kiểm thử

- Backend: Spring Boot local, default port 8080.
- Frontend: React/Vite local, default port 5173.
- Database: MySQL.
- Tools: Browser DevTools, Postman, MySQL client, Excel/Google Sheet.

## 5. Test data đề xuất

| Nhóm dữ liệu | Dữ liệu |
|---|---|
| Admin account | admin / password hợp lệ |
| User account | user / password hợp lệ |
| Invalid login | sai username hoặc password |
| Product | sản phẩm active, sản phẩm hết hàng, sản phẩm có ảnh |
| Category | category active, featured category |
| Coupon | coupon hợp lệ, coupon hết hạn, coupon sai code |
| Address | địa chỉ mặc định, địa chỉ mới |
| Payment | COD, chuyển khoản hoặc phương thức đang hỗ trợ |

## 6. Entry criteria

- Backend chạy thành công.
- Frontend chạy thành công.
- Database kết nối được.
- Có ít nhất một tài khoản user và admin.
- Có dữ liệu sản phẩm/category để test.

## 7. Exit criteria

- Các test case mức High/Critical đã pass.
- Bug Critical/High đã được xử lý hoặc có quyết định chấp nhận.
- Test summary report được cập nhật.
- Không còn lỗi chặn luồng chính: login, add to cart, checkout, order.

## 8. Rủi ro

| Rủi ro | Ảnh hưởng | Cách xử lý |
|---|---|---|
| Thiếu test data | Không test đủ flow | Chuẩn bị seed data trước khi test |
| Backend không chạy | Không test UI/API được | Kiểm tra log backend và cấu hình DB |
| Token hết hạn | API test fail | Login lại và cập nhật token |
| Dữ liệu order/payment phụ thuộc nhau | Kết quả test sai | Ghi rõ pre-condition cho từng case |

## 9. Test deliverables

- `QA_TEST_PLAN.md`
- `TEST_CASES.md`
- `BUG_REPORT_TEMPLATE.md`
- `API_TEST_CHECKLIST.md`
- `DATABASE_TEST_CHECKLIST.md`
- `TEST_SUMMARY_REPORT.md`
