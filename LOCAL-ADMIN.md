# Quản trị Linh Flower House trên máy tính và điện thoại

## Mở website

Trong thư mục dự án, chạy PowerShell:

```powershell
.\start-local.ps1
```

Máy chủ chạy nền. Mở http://127.0.0.1:5173/admin trên máy tính.
Địa chỉ dành cho điện thoại và mã đăng nhập được lưu tại `.sites-runtime/mobile-access.txt`.
Điện thoại cần cùng Wi-Fi với máy tính; giữ máy tính và máy chủ đang chạy.
Nếu đổi mạng, chạy lại `start-local.ps1` để cập nhật địa chỉ IP trong tệp hướng dẫn.

Nếu Windows chặn kết nối từ điện thoại, mở PowerShell **Run as administrator** tại thư mục dự án và chạy:

```powershell
.\enable-phone-access.ps1
```

Quy tắc này chỉ cho phép ứng dụng Node.js của dự án, cổng TCP 5173, trên Wi-Fi và từ mạng nội bộ. Có thể gỡ bằng PowerShell quản trị:

```powershell
Remove-NetFirewallRule -Name LinhFlowerHouse-Local-5173
```

## Các thao tác quản trị

- **Sản phẩm:** thêm, sửa, xóa, ẩn/hiện; sửa giá, tồn kho, mô tả, nhãn và trạng thái nổi bật. Tìm kiếm không dấu, lọc danh mục/trạng thái, sắp xếp và phân trang.
- **Thư viện ảnh:** mỗi sản phẩm có tối đa 12 ảnh. Chọn nhiều ảnh từ thư viện hoặc chụp bằng camera sau trên điện thoại; kéo ảnh để đổi thứ tự, ảnh đầu tiên là ảnh bìa trong catalogue. Ảnh gốc tối đa 25 MB, tự thu nhỏ cạnh dài xuống 1600 px và chuyển sang WebP. Máy chủ chỉ nhận JPG/PNG/WebP, tối đa 8 MB cho mỗi ảnh. HEIC phụ thuộc khả năng giải mã của trình duyệt; nếu không đọc được, xuất JPG trước. Ảnh chỉ gắn vào sản phẩm sau khi bấm **Lưu sản phẩm**.
- **Danh mục:** thêm, sửa tên/đường dẫn/thứ tự/hiển thị và xóa. Phải chuyển hết sản phẩm sang danh mục khác trước khi xóa.
- **Đơn hàng:** tạo đơn thủ công; sửa người mua, người nhận, địa chỉ, ngày/giờ giao, sản phẩm, số lượng, đơn giá, thiệp và ghi chú; đổi trạng thái hoặc xóa có xác nhận. Tổng tiền được tính lại trên máy chủ. Đơn giá trong đơn là giá tại thời điểm đặt, không tự thay đổi theo giá sản phẩm.
- **Tổng quan:** doanh thu chỉ tính các đơn **Hoàn tất**. Tồn kho hiện là số lượng do quản trị nhập, chưa có cơ chế tự động trừ/hoàn kho khi đổi trạng thái đơn.
- **Nội dung:** sửa thông báo, tiêu đề/giới thiệu trang chủ và các liên kết liên hệ.

## Catalogue cho khách

Trang chủ chỉ hiển thị catalogue công khai: toàn bộ sản phẩm, tìm kiếm, lọc danh mục, trang chi tiết với thư viện ảnh và nút nhắn Zalo. Không có giỏ hàng, thanh toán hay biểu mẫu đặt hàng trên trang khách.

Trước khi gửi website cho khách, vào **Quản trị → Nội dung → Liên kết Zalo** và dán đường dẫn Zalo thật của shop, ví dụ `https://zalo.me/xxxxxxxxxx`. Nút Zalo trên trang chủ và trong từng sản phẩm sẽ dùng liên kết này.

## Dữ liệu và đăng nhập

- Giữ `.wrangler/state/`: chứa cơ sở dữ liệu và ảnh upload local. Sao lưu thư mục này khi máy chủ đã dừng.
- `.dev.vars` chứa mã truy cập riêng, chỉ dùng ở chế độ phát triển; không đưa lên Git hoặc chia sẻ công khai. Cookie đăng nhập điện thoại có hiệu lực 12 giờ.
- Ảnh đã upload nhưng chưa lưu sản phẩm hoặc ảnh cũ sau khi thay thế vẫn được giữ trong kho; chưa có màn hình dọn ảnh không sử dụng.
- Truy cập trên Internet cần triển khai lên hosting với HTTPS và tài khoản quản trị chính thức; mã local không hoạt động trong bản production.

## Kiểm tra

```powershell
$env:PATH = "$PWD\.local-tools\node-v22.23.3-win-x64;$env:PATH"
npm.cmd run build
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/eslint/bin/eslint.js app/admin app/api/admin app/api/media lib/cms.ts lib/admin-validation.ts
```

Kiểm thử trình duyệt (cần Google Chrome, máy chủ đang chạy):

```powershell
$env:NODE_USE_SYSTEM_CA = '1'
npm.cmd install --prefix .sites-runtime/qa --no-save --package-lock=false --no-audit --no-fund playwright
node scripts/admin-smoke.mjs
```

Kiểm thử tạo dữ liệu có tiền tố riêng `QA-...`, dọn các bản ghi đó sau khi chạy và lưu ảnh chụp giao diện tại `outputs/admin-qa/`. Không xóa dữ liệu cửa hàng có sẵn.
