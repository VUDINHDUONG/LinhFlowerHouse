# Bản test Linh Flower House

Máy chủ local phải đang chạy bằng lệnh `./start-local.ps1`.

| Người dùng | Đường dẫn trên máy tính | Đường dẫn trên điện thoại cùng Wi-Fi |
| --- | --- | --- |
| Khách xem catalogue | `http://127.0.0.1:5173/` | Xem địa chỉ hiện hành trong `.sites-runtime/mobile-access.txt`, bỏ phần `/admin` ở cuối |
| Quản trị viên | `http://127.0.0.1:5173/admin` | Xem `.sites-runtime/mobile-access.txt` |

Không gửi đường dẫn hoặc mã quản trị cho khách. Khách chỉ cần đường dẫn catalogue; trang này không có giỏ hàng, thanh toán hoặc biểu mẫu đặt đơn.

## Những việc cần duyệt

1. Trang đầu hiển thị catalogue, tìm kiếm và lọc danh mục.
2. Mở một sản phẩm để xem ảnh, giá, mô tả và nút Zalo.
3. Trên điện thoại, kiểm tra trình bày không bị tràn ngang.
4. Trong quản trị, tạo hoặc sửa sản phẩm, tải nhiều ảnh rồi xác nhận ảnh đầu tiên là ảnh bìa trên catalogue.
5. Vào **Nội dung** và thay liên kết Zalo thử nghiệm bằng liên kết Zalo thật của shop trước khi gửi khách.

Các URL local chỉ dùng được khi máy tính đang mở web và người xem ở cùng Wi-Fi. Để khách xem từ Internet, cần triển khai bản test lên một hosting công khai có HTTPS.
